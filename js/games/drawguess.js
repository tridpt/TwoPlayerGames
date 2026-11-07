/* Vẽ & Đoán — năm vòng, luân phiên người vẽ. Đáp án chỉ lưu trên máy
   người vẽ; lịch sử online chứa nét vẽ, câu đoán và phán quyết công khai. */
(function () {
  const ROUNDS = 5;
  const ROUND_MS = 60_000;
  const WIDTH = 900;
  const HEIGHT = 600;
  const MAX_POINTS = 180;
  const COLORS = ["#202638", "#e24b4b", "#ea9929", "#32a268", "#377bdb", "#8b58bf"];
  const CATEGORIES = [
    ["Động vật", "Animals"], ["Đồ vật", "Objects"],
    ["Thiên nhiên", "Nature"], ["Thức ăn", "Food"],
    ["Địa điểm", "Places"], ["Phương tiện", "Transport"],
  ];
  // [tiếng Việt, English, chủ đề]. Chỉ người vẽ chọn mục; chỉ chủ đề được gửi.
  const WORDS = [
    ["con mèo", "cat", 0], ["con chó", "dog", 0], ["con voi", "elephant", 0],
    ["con hươu cao cổ", "giraffe", 0], ["con cá", "fish", 0], ["con bướm", "butterfly", 0],
    ["con chim", "bird", 0], ["con rùa", "turtle", 0], ["con thỏ", "rabbit", 0],
    ["con cua", "crab", 0], ["con bạch tuộc", "octopus", 0], ["con ong", "bee", 0],
    ["con ốc sên", "snail", 0], ["con ngựa", "horse", 0], ["con vịt", "duck", 0],
    ["con nhện", "spider", 0], ["con khủng long", "dinosaur", 0],
    ["cái ô", "umbrella", 1], ["cái đồng hồ", "clock", 1], ["cái ghế", "chair", 1],
    ["cái bàn", "table", 1], ["cái đèn", "lamp", 1], ["cái chìa khóa", "key", 1],
    ["cái kéo", "scissors", 1], ["cái điện thoại", "phone", 1],
    ["cái máy ảnh", "camera", 1], ["cái mũ", "hat", 1], ["cái kính", "glasses", 1],
    ["cái bàn chải", "toothbrush", 1], ["cái cốc", "cup", 1], ["quyển sách", "book", 1],
    ["quả bóng", "ball", 1], ["cây đàn guitar", "guitar", 1], ["cây bút", "pen", 1],
    ["ngôi sao", "star", 2], ["mặt trời", "sun", 2], ["mặt trăng", "moon", 2],
    ["đám mây", "cloud", 2], ["cầu vồng", "rainbow", 2], ["bông hoa", "flower", 2],
    ["cái cây", "tree", 2], ["ngọn núi", "mountain", 2], ["núi lửa", "volcano", 2],
    ["bông tuyết", "snowflake", 2], ["thác nước", "waterfall", 2],
    ["quả táo", "apple", 3], ["quả chuối", "banana", 3], ["quả dứa", "pineapple", 3],
    ["miếng pizza", "pizza", 3], ["chiếc bánh", "cake", 3], ["kem", "ice cream", 3],
    ["bánh mì", "bread", 3], ["quả trứng", "egg", 3], ["cốc cà phê", "coffee", 3],
    ["ngôi nhà", "house", 4], ["lâu đài", "castle", 4], ["cầu", "bridge", 4],
    ["ngọn hải đăng", "lighthouse", 4], ["lều", "tent", 4], ["trường học", "school", 4],
    ["xe đạp", "bicycle", 5], ["ô tô", "car", 5], ["máy bay", "airplane", 5],
    ["tàu hỏa", "train", 5], ["con thuyền", "boat", 5], ["tên lửa", "rocket", 5],
    ["xe buýt", "bus", 5], ["xe máy", "motorbike", 5],
  ];

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  function matchesWord(guess, word) {
    const entered = normalize(guess);
    const vietnamese = normalize(word[0]);
    const bareVietnamese = vietnamese.replace(/^(con|cai|qua|chiec|cay|coc|mieng|ngon|quyen|dam|bong) /, "");
    return entered === vietnamese || entered === bareVietnamese || entered === normalize(word[1]);
  }

  function knownWord(pair, category) {
    return Array.isArray(pair) && pair.length === 2
      && WORDS.some((entry) => entry[0] === pair[0] && entry[1] === pair[1]
        && (category == null || entry[2] === category));
  }

  function create(ctx) {
    const online = !!ctx.isOnline;
    const seat = online ? ctx.mySeat : -1;
    let round = 0;
    let phase = "ready"; // ready | drawing | between | over
    let score = [0, 0];
    let secret = null;
    let usedWords = [];
    let category = -1;
    let deadline = 0;
    let strokes = [];
    let pendingGuess = null;
    let guesses = [];
    let lastResult = null;
    let revealLocal = false;
    let color = COLORS[0];
    let penSize = 5;
    let drawing = null;
    let clock = null;
    let destroyed = false;

    const root = document.createElement("section");
    root.className = "dg-root";
    root.innerHTML = `
      <div class="dg-head"><strong class="dg-round"></strong><span class="dg-timer" role="timer"></span></div>
      <div class="dg-scores"><span class="dg-score-p1"></span><span class="dg-score-p2"></span></div>
      <p class="dg-hint"></p>
      <p class="dg-result" aria-live="polite"></p>
      <div class="dg-secret-box"><span class="dg-secret"></span>
        <button class="btn dg-reveal" type="button"></button></div>
      <button class="btn primary dg-start" type="button"></button>
      <div class="dg-tools" aria-label="${ctx.t("Dụng cụ vẽ", "Drawing tools")}">
        <div class="dg-colors"></div>
        <button class="btn dg-size" type="button"></button>
        <button class="btn dg-undo" type="button">${ctx.t("Hoàn tác", "Undo")}</button>
        <button class="btn dg-clear" type="button">${ctx.t("Xóa bảng", "Clear")}</button>
      </div>
      <canvas class="dg-canvas" width="${WIDTH}" height="${HEIGHT}" aria-label="${ctx.t("Bảng vẽ", "Drawing board")}"></canvas>
      <form class="dg-guess-form"><label for="dgGuessInput">${ctx.t("Nhập đáp án", "Your guess")}</label>
        <div class="dg-guess-row"><input id="dgGuessInput" class="dg-guess" type="text" maxlength="64" autocomplete="off" spellcheck="false" required>
        <button class="btn primary dg-submit" type="submit">${ctx.t("Đoán", "Guess")}</button></div></form>
      <div class="dg-guesses" aria-live="polite"></div>`;
    ctx.boardEl.appendChild(root);

    const els = {
      round: root.querySelector(".dg-round"), timer: root.querySelector(".dg-timer"),
      p1: root.querySelector(".dg-score-p1"), p2: root.querySelector(".dg-score-p2"),
      hint: root.querySelector(".dg-hint"), result: root.querySelector(".dg-result"),
      secretBox: root.querySelector(".dg-secret-box"), secret: root.querySelector(".dg-secret"),
      reveal: root.querySelector(".dg-reveal"), start: root.querySelector(".dg-start"),
      tools: root.querySelector(".dg-tools"), colors: root.querySelector(".dg-colors"),
      size: root.querySelector(".dg-size"), undo: root.querySelector(".dg-undo"),
      clear: root.querySelector(".dg-clear"), canvas: root.querySelector(".dg-canvas"),
      form: root.querySelector(".dg-guess-form"), guess: root.querySelector(".dg-guess"),
      submit: root.querySelector(".dg-submit"), guesses: root.querySelector(".dg-guesses"),
    };
    const paint = els.canvas.getContext("2d");

    function drawer() { return round % 2; }
    function guesser() { return 1 - drawer(); }
    function canAct(asSeat) { return !online || seat === asSeat; }
    function available(asSeat) { return canAct(asSeat) && !ctx.fastForward && !ctx.inputLocked?.(); }
    function wordText(pair) { return pair ? ctx.t(pair[0], pair[1]) : ""; }

    function chooseWord() {
      const remaining = WORDS.map((_, i) => i).filter((i) => !usedWords.includes(i));
      const source = remaining.length ? remaining : WORDS.map((_, i) => i);
      let n;
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        n = values[0] % source.length;
      } else n = Math.floor(Math.random() * source.length);
      const index = source[n];
      usedWords.push(index);
      return WORDS[index];
    }

    function drawStroke(stroke) {
      const points = stroke.p;
      if (!points.length) return;
      paint.strokeStyle = stroke.c;
      paint.fillStyle = stroke.c;
      paint.lineWidth = stroke.w;
      paint.lineCap = "round";
      paint.lineJoin = "round";
      if (points.length === 1) {
        paint.beginPath();
        paint.arc(points[0][0], points[0][1], stroke.w / 2, 0, Math.PI * 2);
        paint.fill();
        return;
      }
      paint.beginPath();
      paint.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) paint.lineTo(points[i][0], points[i][1]);
      paint.stroke();
    }

    function redraw() {
      paint.fillStyle = "#ffffff";
      paint.fillRect(0, 0, WIDTH, HEIGHT);
      strokes.forEach(drawStroke);
      if (drawing) drawStroke(drawing);
    }

    function stopClock() { if (clock) { clearInterval(clock); clock = null; } }
    function tick() {
      if (phase !== "drawing" || ctx.fastForward) return;
      // Câu đoán có thể tới khi máy người vẽ còn bị khóa trong lúc khôi phục.
      // Chấm ngay khi kết nối ổn định, không đợi đến khi đồng hồ hết giờ.
      if (pendingGuess && available(drawer())) judgePending();
      if (phase !== "drawing") return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      els.timer.textContent = `⏱ ${left}s`;
      els.timer.classList.toggle("dg-urgent", left <= 10);
      if (left === 0 && available(drawer()) && secret) {
        if (pendingGuess) judgePending();
        if (phase === "drawing" && !pendingGuess) {
          applyMove({ k: "timeout", r: round, by: drawer(), reveal: [secret[0], secret[1]] }, false);
        }
      }
    }
    function startClock() {
      stopClock();
      if (phase !== "drawing" || ctx.fastForward) return;
      tick();
      if (phase === "drawing") clock = setInterval(tick, 250);
    }

    function render() {
      const activeRound = Math.min(round + 1, ROUNDS);
      els.round.textContent = ctx.t(`Vòng ${activeRound}/${ROUNDS}`, `Round ${activeRound}/${ROUNDS}`);
      els.p1.textContent = `P1: ${score[0]}`;
      els.p2.textContent = `P2: ${score[1]}`;
      els.timer.textContent = phase === "drawing" ? `⏱ ${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))}s` : "";
      els.hint.textContent = phase === "drawing"
        ? ctx.t(`P${drawer() + 1} vẽ · P${guesser() + 1} đoán · Chủ đề: ${CATEGORIES[category]?.[0] || "?"}`,
          `P${drawer() + 1} draws · P${guesser() + 1} guesses · Category: ${CATEGORIES[category]?.[1] || "?"}`)
        : phase === "over" ? ctx.t("Đã kết thúc 5 vòng.", "All 5 rounds finished.")
          : ctx.t(`P${drawer() + 1} sẽ vẽ ở vòng tiếp theo.`, `P${drawer() + 1} draws next.`);
      els.result.textContent = lastResult || "";
      const isDrawing = phase === "drawing";
      const showWord = isDrawing && canAct(drawer()) && !!secret && (online || revealLocal);
      els.secretBox.hidden = !isDrawing || !canAct(drawer()) || !secret;
      els.secret.textContent = showWord ? ctx.t(`Từ cần vẽ: ${wordText(secret)}`, `Draw: ${wordText(secret)}`)
        : ctx.t("Từ bí mật đang ẩn", "Secret word hidden");
      els.reveal.hidden = online;
      els.reveal.textContent = revealLocal ? ctx.t("Ẩn từ", "Hide word") : ctx.t("Xem từ bí mật", "Show secret word");
      els.start.hidden = !(phase === "ready" || phase === "between") || !canAct(drawer());
      // boardWrap.inert được gỡ sau pha khôi phục mà không phát render mới.
      // Đừng ghi trạng thái khóa tạm thời đó vào thuộc tính disabled.
      els.start.disabled = !canAct(drawer());
      els.start.textContent = phase === "ready" ? ctx.t("Bắt đầu vòng 1", "Start round 1")
        : ctx.t(`Bắt đầu vòng ${round + 1}`, `Start round ${round + 1}`);
      els.tools.hidden = !isDrawing || !canAct(drawer());
      els.undo.disabled = !canAct(drawer()) || strokes.length === 0;
      els.clear.disabled = !canAct(drawer()) || strokes.length === 0;
      els.size.textContent = ctx.t(`Nét ${penSize}px`, `Brush ${penSize}px`);
      els.form.hidden = !isDrawing || !canAct(guesser());
      els.guess.disabled = !canAct(guesser()) || !!pendingGuess;
      els.submit.disabled = els.guess.disabled;
      els.guesses.innerHTML = "";
      for (const item of guesses.slice(-5)) {
        const line = document.createElement("p");
        line.textContent = `${item.correct ? "✅" : "❌"} ${item.text}`;
        els.guesses.appendChild(line);
      }
    }

    function finishRound(correct, reveal) {
      stopClock();
      drawing = null;
      pendingGuess = null;
      revealLocal = false;
      if (correct) {
        score[guesser()] += 2;
        score[drawer()] += 1;
      } else score[drawer()] += 1;
      const word = wordText(reveal);
      const wordIndex = WORDS.findIndex((entry) => entry[0] === reveal[0] && entry[1] === reveal[1]);
      if (wordIndex >= 0 && !usedWords.includes(wordIndex)) usedWords.push(wordIndex);
      const completed = round + 1;
      lastResult = correct
        ? ctx.t(`P${guesser() + 1} đoán đúng! Đáp án: ${word}. Cả hai được điểm.`,
          `P${guesser() + 1} guessed correctly! Word: ${word}. Both score.`)
        : ctx.t(`Hết giờ! Đáp án: ${word}. P${drawer() + 1} được 1 điểm.`,
          `Time is up! Word: ${word}. P${drawer() + 1} scores 1 point.`);
      secret = null;
      if (completed >= ROUNDS) {
        phase = "over";
        ctx.setTurn(-1);
        const winner = score[0] === score[1] ? -1 : score[0] > score[1] ? 0 : 1;
        if (winner >= 0) ctx.incScore(winner);
        render();
        ctx.setStatus(winner < 0
          ? ctx.t(`🤝 Hòa ${score[0]}–${score[1]} sau 5 vòng!`, `🤝 Draw ${score[0]}–${score[1]} after 5 rounds!`)
          : ctx.t(`🎉 P${winner + 1} thắng ${score[0]}–${score[1]} sau 5 vòng!`,
            `🎉 P${winner + 1} wins ${score[0]}–${score[1]} after 5 rounds!`));
      } else {
        round++;
        phase = "between";
        ctx.setTurn(drawer());
        render();
        ctx.setStatus(ctx.t(`Vòng ${completed} kết thúc. P${drawer() + 1} bấm bắt đầu vòng kế.`,
          `Round ${completed} finished. P${drawer() + 1} starts the next round.`));
      }
      ctx.sound(correct ? "win" : "miss");
    }

    function judgePending() {
      if (!pendingGuess || !secret || !available(drawer())) return;
      const correct = matchesWord(pendingGuess, secret);
      applyMove({ k: "judge", r: round, by: drawer(), correct,
        reveal: correct ? [secret[0], secret[1]] : null }, false);
    }

    function validStroke(move) {
      return Array.isArray(move.p) && move.p.length >= 1 && move.p.length <= MAX_POINTS
        && COLORS.includes(move.c) && [3, 5, 9].includes(move.w)
        && move.p.every((p) => Array.isArray(p) && p.length === 2
          && Number.isInteger(p[0]) && p[0] >= 0 && p[0] <= WIDTH
          && Number.isInteger(p[1]) && p[1] >= 0 && p[1] <= HEIGHT);
    }

    function applyMove(move, fromRemote) {
      if (!move || typeof move !== "object" || destroyed || phase === "over") return;
      if (!fromRemote && !ctx.fastForward && ctx.inputLocked?.()) return;
      if (online && !ctx.fastForward && move.by !== (fromRemote ? 1 - seat : seat)) return;
      if (move.r !== round) return;
      if (move.k === "start") {
        if ((phase !== "ready" && phase !== "between") || move.by !== drawer()) return;
        if (!fromRemote && !ctx.fastForward) {
          secret = chooseWord();
          move = { k: "start", r: round, by: drawer(), at: Date.now(), category: secret[2] };
        } else secret = null;
        if (!Number.isInteger(move.category) || move.category < 0 || move.category >= CATEGORIES.length
          || !Number.isFinite(move.at) || move.at <= 0) return;
        category = move.category;
        deadline = move.at + ROUND_MS;
        strokes = [];
        guesses = [];
        pendingGuess = null;
        lastResult = null;
        revealLocal = false;
        phase = "drawing";
        if (!fromRemote && !ctx.fastForward) ctx.sendMove(move);
        redraw();
        ctx.setTurn(guesser());
        render();
        ctx.setStatus(ctx.t(`P${drawer() + 1} vẽ, P${guesser() + 1} đoán trong 60 giây.`,
          `P${drawer() + 1} draws, P${guesser() + 1} guesses in 60 seconds.`));
        startClock();
      } else if (phase === "drawing" && move.k === "stroke") {
        if (move.by !== drawer() || !validStroke(move) || strokes.length >= 120) return;
        const stroke = { p: move.p.map((p) => [p[0], p[1]]), c: move.c, w: move.w };
        strokes.push(stroke);
        if (!fromRemote && !ctx.fastForward) ctx.sendMove({ k: "stroke", r: round, by: drawer(), ...stroke });
        redraw();
        render();
      } else if (phase === "drawing" && (move.k === "undo" || move.k === "clear")) {
        if (move.by !== drawer() || !strokes.length) return;
        if (move.k === "undo") strokes.pop(); else strokes = [];
        if (!fromRemote && !ctx.fastForward) ctx.sendMove({ k: move.k, r: round, by: drawer() });
        redraw();
        render();
      } else if (phase === "drawing" && move.k === "guess") {
        if (move.by !== guesser() || pendingGuess || typeof move.text !== "string") return;
        const guess = move.text.trim().slice(0, 64);
        if (!normalize(guess)) return;
        pendingGuess = guess;
        if (!fromRemote && !ctx.fastForward) ctx.sendMove({ k: "guess", r: round, by: guesser(), text: guess });
        els.guess.value = "";
        render();
        if (!ctx.fastForward && available(drawer())) judgePending();
      } else if (phase === "drawing" && move.k === "judge") {
        if (move.by !== drawer() || !pendingGuess || typeof move.correct !== "boolean") return;
        if (move.correct && (!knownWord(move.reveal, category) || !matchesWord(pendingGuess, move.reveal))) return;
        if (secret && (move.correct !== matchesWord(pendingGuess, secret)
          || (move.correct && (move.reveal[0] !== secret[0] || move.reveal[1] !== secret[1])))) return;
        const guess = pendingGuess;
        pendingGuess = null;
        guesses.push({ text: guess, correct: move.correct });
        if (!fromRemote && !ctx.fastForward) ctx.sendMove({ k: "judge", r: round, by: drawer(),
          correct: move.correct, reveal: move.correct ? move.reveal : null });
        if (move.correct) finishRound(true, move.reveal);
        else {
          render();
          ctx.setStatus(ctx.t(`P${guesser() + 1} đoán chưa đúng. Còn ${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))} giây.`,
            `P${guesser() + 1} guessed wrong. Keep trying!`));
          tick();
        }
      } else if (phase === "drawing" && move.k === "timeout") {
        if (move.by !== drawer() || !knownWord(move.reveal, category)
          || (secret && (move.reveal[0] !== secret[0] || move.reveal[1] !== secret[1]))) return;
        if (!fromRemote && !ctx.fastForward) ctx.sendMove({ k: "timeout", r: round, by: drawer(), reveal: move.reveal });
        finishRound(false, move.reveal);
      }
    }

    function point(event) {
      const box = els.canvas.getBoundingClientRect();
      return [Math.max(0, Math.min(WIDTH, Math.round((event.clientX - box.left) * WIDTH / box.width))),
        Math.max(0, Math.min(HEIGHT, Math.round((event.clientY - box.top) * HEIGHT / box.height)))];
    }
    function pointerDown(event) {
      if (phase !== "drawing" || !available(drawer()) || event.button > 0) return;
      event.preventDefault();
      els.canvas.setPointerCapture?.(event.pointerId);
      drawing = { p: [point(event)], c: color, w: penSize };
      redraw();
    }
    function pointerMove(event) {
      if (!drawing) return;
      event.preventDefault();
      const next = point(event);
      const previous = drawing.p[drawing.p.length - 1];
      if (Math.abs(next[0] - previous[0]) + Math.abs(next[1] - previous[1]) < 3) return;
      if (drawing.p.length >= MAX_POINTS * 2) drawing.p = drawing.p.filter((_, i) => i % 2 === 0);
      drawing.p.push(next);
      redraw();
    }
    function pointerUp(event) {
      if (!drawing) return;
      event.preventDefault();
      const stroke = drawing;
      drawing = null;
      const last = point(event);
      if (stroke.p.at(-1)[0] !== last[0] || stroke.p.at(-1)[1] !== last[1]) stroke.p.push(last);
      if (stroke.p.length > MAX_POINTS) {
        stroke.p = Array.from({ length: MAX_POINTS }, (_, i) =>
          stroke.p[Math.round(i * (stroke.p.length - 1) / (MAX_POINTS - 1))]);
      }
      applyMove({ k: "stroke", r: round, by: drawer(), ...stroke }, false);
      redraw();
    }

    for (const hex of COLORS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dg-color";
      button.style.backgroundColor = hex;
      button.setAttribute("aria-label", ctx.t(`Màu ${hex}`, `Color ${hex}`));
      button.addEventListener("click", () => { color = hex; updatePalette(); });
      els.colors.appendChild(button);
    }
    function updatePalette() {
      Array.from(els.colors.children).forEach((button, i) =>
        button.classList.toggle("selected", COLORS[i] === color));
    }
    updatePalette();
    els.start.addEventListener("click", () => applyMove({ k: "start", r: round, by: drawer() }, false));
    els.reveal.addEventListener("click", () => { revealLocal = !revealLocal; render(); });
    els.size.addEventListener("click", () => { penSize = penSize === 3 ? 5 : penSize === 5 ? 9 : 3; render(); });
    els.undo.addEventListener("click", () => applyMove({ k: "undo", r: round, by: drawer() }, false));
    els.clear.addEventListener("click", () => applyMove({ k: "clear", r: round, by: drawer() }, false));
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      applyMove({ k: "guess", r: round, by: guesser(), text: els.guess.value }, false);
    });
    els.canvas.addEventListener("pointerdown", pointerDown);
    els.canvas.addEventListener("pointermove", pointerMove);
    els.canvas.addEventListener("pointerup", pointerUp);
    els.canvas.addEventListener("pointercancel", pointerUp);

    function exportState() {
      return { v: 1, round, phase, score, secret, usedWords, category, deadline,
        strokes, pendingGuess, guesses, lastResult };
    }
    function importState(state) {
      if (!state || state.v !== 1 || !Number.isInteger(state.round) || state.round < 0
        || state.round >= ROUNDS || !["ready", "drawing", "between", "over"].includes(state.phase)
        || !Array.isArray(state.score) || state.score.length !== 2
        || !state.score.every((n) => Number.isInteger(n) && n >= 0 && n <= ROUNDS * 2)
        || !Array.isArray(state.strokes) || state.strokes.length > 120
        || !state.strokes.every(validStroke)
        || (state.phase === "drawing" && (!Number.isFinite(state.deadline) || state.deadline <= 0
          || !Number.isInteger(state.category) || state.category < 0 || state.category >= CATEGORIES.length
          || (online && seat === state.round % 2 && (!Array.isArray(state.secret)
            || state.secret.length !== 3 || !knownWord(state.secret.slice(0, 2), state.category)))))) return false;
      stopClock();
      round = state.round;
      phase = state.phase;
      score = state.score.map((n) => Number(n) || 0);
      secret = Array.isArray(state.secret) && state.secret.length === 3 ? state.secret : null;
      if (online && seat !== drawer()) secret = null;
      usedWords = Array.isArray(state.usedWords) ? state.usedWords.filter((n) => Number.isInteger(n) && n >= 0 && n < WORDS.length) : [];
      category = Number.isInteger(state.category) ? state.category : -1;
      deadline = Number(state.deadline) || 0;
      strokes = state.strokes.map((s) => ({ p: s.p, c: s.c, w: s.w }));
      pendingGuess = typeof state.pendingGuess === "string" ? state.pendingGuess : null;
      guesses = Array.isArray(state.guesses) ? state.guesses.slice(-50) : [];
      lastResult = typeof state.lastResult === "string" ? state.lastResult : null;
      revealLocal = false;
      redraw();
      render();
      ctx.setTurn(phase === "over" ? -1 : phase === "drawing" ? guesser() : drawer());
      return true;
    }
    function finishHistoryReplay() {
      if (!online || ctx.fastForward || destroyed || phase !== "drawing") return;
      if (pendingGuess && available(drawer())) judgePending();
      startClock();
    }
    function destroy() { destroyed = true; stopClock(); }

    redraw();
    render();
    ctx.setTurn(drawer());
    ctx.setStatus(ctx.t("P1 bấm bắt đầu để nhận từ bí mật và vẽ. P2 đoán trong 60 giây.",
      "P1 starts, gets a secret word and draws. P2 has 60 seconds to guess."));
    return { applyMove, exportState, importState, finishHistoryReplay, destroy };
  }

  window.GameRegistry.register({
    id: "drawguess",
    name: "Vẽ & Đoán",
    emoji: "🎨",
    description: "Một người vẽ, người kia đoán từ bí mật trong 60 giây. Đổi vai qua 5 vòng; chơi chung máy hoặc online.",
    onlineReady: true,
    supportsAI: false,
    howTo: [
      "P1 vẽ vòng đầu, P2 đoán. Mỗi vòng có 60 giây; người vẽ vòng tiếp theo đổi qua P2, rồi luân phiên trong 5 vòng.",
      "Người vẽ bấm Bắt đầu để nhận một từ ngẫu nhiên. Online: chỉ người vẽ thấy từ. Chung máy: bấm Xem từ bí mật, ghi nhớ rồi ẩn trước khi cho người đoán nhìn.",
      "Vẽ bằng chuột hoặc ngón tay. Có thể đổi màu, đổi cỡ nét, hoàn tác nét cuối hoặc xóa bảng. Không viết đáp án lên bảng.",
      "Người đoán nhập từ và bấm Đoán. Có thể đoán nhiều lần; trò chấp nhận tiếng Việt không dấu hoặc từ tiếng Anh tương ứng.",
      "Đoán đúng: người đoán được 2 điểm, người vẽ được 1 điểm. Hết giờ: người vẽ được 1 điểm. Sau 5 vòng, ai nhiều điểm hơn thắng; bằng điểm thì hòa.",
      "Nếu tải lại hoặc rớt mạng giữa ván online, bảng vẽ, điểm, đồng hồ và từ bí mật của người vẽ được khôi phục khi kết nối lại.",
    ],
    create,
  });
})();
