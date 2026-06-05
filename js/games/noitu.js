/* Nối Từ — chơi chung máy & ONLINE (theo lượt, có đồng hồ đếm ngược)
   Mỗi người nhập một từ ghép 2 tiếng, bắt đầu bằng TIẾNG CUỐI của từ trước.
   Không được lặp từ đã dùng. Hết giờ hoặc bí thì thua.

   CƠ CHẾ TRỌNG TÀI: từ được nối tự do (chỉ chặn gõ bậy theo cấu trúc âm tiết).
   Khi tới lượt, bạn có thể "⚖️ Phản đối" từ đối thủ vừa nối. Trọng tài (từ điển
   window.VI_DICT) chấm:
     - Từ KHÔNG có trong từ điển  -> người nối sai phải nối lại, BỊ TRỪ 5s mỗi lượt.
     - Từ CÓ trong từ điển         -> người phản đối sai, BỊ TRỪ 5s mỗi lượt.
   Nước đi: { kind:"word", phrase } | { kind:"timeout" } | { kind:"challenge" }. */
(function () {
  const STARTERS = [
    "học sinh", "bầu trời", "con đường", "mặt trời", "hoa hồng",
    "xinh đẹp", "vui vẻ", "bình minh", "quê hương", "tình bạn",
    "mùa xuân", "dòng sông", "núi rừng", "ánh sáng", "gia đình",
    "thành phố", "biển cả", "cánh đồng", "ngôi sao", "trái tim",
    "cơn mưa", "buổi sáng", "tuổi thơ", "âm nhạc", "hạnh phúc",
  ];
  const PENALTY = 5; // giây bị trừ mỗi lần sai

  function norm(s) { return s.trim().toLowerCase().replace(/\s+/g, " "); }
  function syllables(s) { return norm(s).split(" ").filter(Boolean); }

  // ----- Kiểm tra cấu trúc âm tiết tiếng Việt (chặn gõ bậy) -----
  const BASE_MAP = {
    "à":"a","á":"a","ả":"a","ã":"a","ạ":"a","ă":"a","ằ":"a","ắ":"a","ẳ":"a","ẵ":"a","ặ":"a",
    "â":"a","ầ":"a","ấ":"a","ẩ":"a","ẫ":"a","ậ":"a",
    "è":"e","é":"e","ẻ":"e","ẽ":"e","ẹ":"e","ê":"e","ề":"e","ế":"e","ể":"e","ễ":"e","ệ":"e",
    "ì":"i","í":"i","ỉ":"i","ĩ":"i","ị":"i",
    "ò":"o","ó":"o","ỏ":"o","õ":"o","ọ":"o","ô":"o","ồ":"o","ố":"o","ổ":"o","ỗ":"o","ộ":"o",
    "ơ":"o","ờ":"o","ớ":"o","ở":"o","ỡ":"o","ợ":"o",
    "ù":"u","ú":"u","ủ":"u","ũ":"u","ụ":"u","ư":"u","ừ":"u","ứ":"u","ử":"u","ữ":"u","ự":"u",
    "ỳ":"y","ý":"y","ỷ":"y","ỹ":"y","ỵ":"y","đ":"d",
  };
  function toBase(s) { let o = ""; for (const ch of s) o += BASE_MAP[ch] || ch; return o; }
  const ONSETS = ["ngh","ng","nh","ch","gh","gi","kh","ph","th","tr","qu",
    "b","c","d","g","h","k","l","m","n","p","r","s","t","v","x"];
  const VOWELS = "aeiouy";
  const FINALS = ["","c","ch","m","n","ng","nh","p","t","i","o","u","y"];
  function isVietnameseSyllable(raw) {
    const s = norm(raw);
    if (!s || /[^a-zàáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/.test(s)) return false;
    const base = toBase(s);
    let onset = "";
    for (const oo of ONSETS) { if (base.startsWith(oo)) { onset = oo; break; } }
    const rhyme = base.slice(onset.length);
    if (!rhyme || !VOWELS.includes(rhyme[0])) return false;
    let i = 0;
    while (i < rhyme.length && VOWELS.includes(rhyme[i])) i++;
    const nucleus = rhyme.slice(0, i), final = rhyme.slice(i);
    if (nucleus.length === 0 || nucleus.length > 3) return false;
    if (!FINALS.includes(final)) return false;
    return true;
  }
  function validVietnamese(phrase) { return syllables(phrase).every(isVietnameseSyllable); }

  // trọng tài: từ có trong từ điển không
  function inDictionary(phrase) {
    return !!(window.VI_DICT && window.VI_DICT.has(norm(phrase)));
  }

  function create(ctx) {
    const o = ctx.options || {};
    const TIME = o.time || 20;

    const used = new Set();
    let turn = 0;
    let over = false;
    let lastWord = null;
    let timerId = null;
    let timeLeft = TIME;
    const penalty = [0, 0];           // số giây bị trừ tích lũy mỗi người
    const chain = [];                 // [{ phrase, by, prevLast, el }]

    const root = document.createElement("div");
    root.className = "nt-root";
    root.innerHTML =
      `<div class="nt-need" id="ntNeed"></div>` +
      `<div class="nt-timer" id="ntTimer"></div>` +
      `<div class="nt-inputrow">` +
      `<input class="nt-input" id="ntInput" placeholder="nhập từ 2 tiếng..." autocomplete="off">` +
      `<button class="btn primary" id="ntSend">Nối</button>` +
      `<button class="btn nt-challenge" id="ntChallenge">⚖️ Phản đối</button>` +
      `<button class="btn nt-give">🏳️ Chịu thua</button>` +
      `</div>` +
      `<p class="nt-err" id="ntErr"></p>` +
      `<div class="nt-chain" id="ntChain"></div>`;
    ctx.boardEl.appendChild(root);

    const needEl = root.querySelector("#ntNeed");
    const timerEl = root.querySelector("#ntTimer");
    const input = root.querySelector("#ntInput");
    const sendBtn = root.querySelector("#ntSend");
    const challengeBtn = root.querySelector("#ntChallenge");
    const giveBtn = root.querySelector(".nt-give");
    const errEl = root.querySelector("#ntErr");
    const chainEl = root.querySelector("#ntChain");

    const rand = ctx.isOnline ? ctx.rng : Math.random;
    const opener = STARTERS[Math.floor(rand() * STARTERS.length)];

    function myTurn() { return !ctx.isOnline || turn === ctx.mySeat; }
    function effTime() { return TIME > 0 ? Math.max(5, TIME - penalty[turn]) : 0; }

    function startTimer() {
      stopTimer();
      if (TIME <= 0) { timerEl.textContent = "Không giới hạn giờ"; return; }
      timeLeft = effTime();
      renderTimer();
      timerId = setInterval(() => {
        timeLeft--;
        renderTimer();
        if (timeLeft <= 0) {
          stopTimer();
          if (myTurn()) applyMove({ kind: "timeout" }, false);
        }
      }, 1000);
    }
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function renderTimer() {
      const pen = penalty[turn] > 0 ? ` (−${penalty[turn]}s phạt)` : "";
      timerEl.textContent = TIME > 0 ? `⏱️ ${Math.max(0, timeLeft)}s${pen}` : "Không giới hạn giờ";
      timerEl.classList.toggle("low", TIME > 0 && timeLeft <= 5);
    }

    function validate(phrase) {
      const sy = syllables(phrase);
      if (sy.length !== 2) return "Phải là từ GỒM 2 TIẾNG (ví dụ: học sinh).";
      if (!validVietnamese(phrase)) return "Không phải tiếng Việt — đừng gõ bậy nhé!";
      if (lastWord && sy[0] !== lastWord) return `Phải bắt đầu bằng tiếng "${lastWord}".`;
      if (used.has(sy.join(" "))) return "Từ này đã được dùng rồi.";
      return null;
    }

    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    challengeBtn.addEventListener("click", () => {
      if (!myTurn() || over) return;
      applyMove({ kind: "challenge" }, false);
    });
    giveBtn.addEventListener("click", () => {
      if (!myTurn() || over) return;
      applyMove({ kind: "timeout" }, false);
    });

    function submit() {
      if (!myTurn() || over) return;
      const phrase = norm(input.value);
      const err = validate(phrase);
      if (err) { errEl.textContent = err; return; }
      errEl.textContent = "";
      input.value = "";
      applyMove({ kind: "word", phrase }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;

      if (move.kind === "timeout") {
        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
        stopTimer();
        return endGame(1 - turn, `Người chơi ${turn + 1} hết giờ / chịu thua`);
      }

      if (move.kind === "word") {
        const sy = syllables(move.phrase);
        if (sy.length !== 2) return;
        if (lastWord && sy[0] !== lastWord) return;
        const key = sy.join(" ");
        if (used.has(key)) return;
        if (!validVietnamese(key)) return;

        if (!fromRemote && ctx.isOnline) ctx.sendMove({ kind: "word", phrase: key });

        const entry = { phrase: key, by: turn, prevLast: lastWord };
        entry.el = addChainWord(key, turn);
        chain.push(entry);
        used.add(key);
        lastWord = sy[1];
        ctx.sound("place");
        errEl.textContent = "";
        turn = 1 - turn;
        ctx.setTurn(turn);
        startTimer();
        updateUI();
        return;
      }

      if (move.kind === "challenge") {
        // người đang tới lượt (turn) phản đối từ cuối cùng (do đối thủ nối)
        const target = chain[chain.length - 1];
        if (!target || target.by === null) return; // không có gì để phản đối
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ kind: "challenge" });

        const ok = inDictionary(target.phrase);
        if (!ok) {
          // người nối (target.by) SAI -> gỡ từ, phạt họ, bắt nối lại
          used.delete(target.phrase);
          if (target.el) target.el.remove();
          chain.pop();
          lastWord = target.prevLast;
          penalty[target.by] += PENALTY;
          ctx.sound("error");
          flashJudge(`⚖️ "${target.phrase}" KHÔNG có trong từ điển! Người chơi ${target.by + 1} nối sai, bị trừ ${PENALTY}s và phải nối lại.`, false);
          turn = target.by;            // người sai nối lại
        } else {
          // người phản đối (turn) SAI -> phạt người phản đối
          penalty[turn] += PENALTY;
          ctx.sound("error");
          flashJudge(`⚖️ "${target.phrase}" CÓ trong từ điển — phản đối sai! Người chơi ${turn + 1} bị trừ ${PENALTY}s.`, true);
          // turn giữ nguyên: người phản đối vẫn phải nối
        }
        ctx.setTurn(turn);
        startTimer();
        updateUI();
        return;
      }
    }

    function flashJudge(text, challengerWrong) {
      errEl.textContent = text;
      errEl.classList.toggle("nt-judge-bad", !challengerWrong);
      errEl.classList.toggle("nt-judge-warn", challengerWrong);
      setTimeout(() => errEl.classList.remove("nt-judge-bad", "nt-judge-warn"), 2500);
    }

    function addChainWord(phrase, who) {
      const item = document.createElement("span");
      item.className = "nt-word " + (who === 0 ? "p1" : who === 1 ? "p2" : "sys");
      item.textContent = phrase;
      chainEl.appendChild(item);
      chainEl.scrollTop = chainEl.scrollHeight;
      return item;
    }

    function endGame(winner, reason) {
      over = true;
      stopTimer();
      ctx.setTurn(-1);
      input.disabled = true; sendBtn.disabled = true; challengeBtn.disabled = true; giveBtn.disabled = true;
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng — ${reason}!`);
    }

    function updateUI() {
      needEl.innerHTML = lastWord
        ? `Nối tiếp từ tiếng: <b>"${lastWord}"</b>`
        : `Mở màn — gợi ý: <b>${opener}</b>`;
      const mine = myTurn() && !over;
      input.disabled = !mine;
      sendBtn.disabled = !mine;
      giveBtn.disabled = !mine;
      // chỉ cho phản đối khi tới lượt mình và có từ của đối thủ ở cuối chuỗi
      const last = chain[chain.length - 1];
      const canChallenge = mine && last && last.by !== null && last.by !== turn;
      challengeBtn.disabled = !canChallenge;
      challengeBtn.classList.toggle("hidden", !last || last.by === null);
      if (mine) input.focus();
      ctx.setStatus(`Lượt Người chơi ${turn + 1} nối từ.`);
    }

    // mở màn: thêm từ gợi ý vào chuỗi như "hệ thống" (by = null), không bị phản đối
    chain.push({ phrase: opener, by: null, prevLast: null, el: addChainWord(opener, null) });
    used.add(opener);
    lastWord = syllables(opener)[1];

    ctx.setTurn(0);
    updateUI();
    startTimer();
    ctx.setStatus("Nối từ 2 tiếng theo tiếng cuối. Nghi từ đối thủ vô nghĩa? Bấm '⚖️ Phản đối' để trọng tài chấm!");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "noitu",
    name: "Nối Từ",
    emoji: "🔤",
    description: "Nối từ ghép 2 tiếng. Nghi từ đối thủ vô nghĩa thì phản đối — trọng tài (từ điển) sẽ chấm.",
    onlineReady: true,
    options: [
      {
        id: "time", label: "Thời gian mỗi lượt", default: 20,
        choices: [
          { value: 0, label: "Không giới hạn" },
          { value: 15, label: "15 giây (gắt)" },
          { value: 20, label: "20 giây" },
          { value: 30, label: "30 giây (thong thả)" },
        ],
      },
    ],
    howTo: [
      "Mở màn bằng một từ gợi ý. Người tiếp theo nối bằng từ 2 tiếng bắt đầu bằng TIẾNG CUỐI của từ trước (ví dụ 'học sinh' → 'sinh viên').",
      "Không dùng lại từ đã xuất hiện. Mỗi lượt có đồng hồ đếm ngược — hết giờ là thua.",
      "Từ được nối khá tự do (chỉ chặn gõ bậy). Nếu bạn NGHI từ đối thủ vừa nối là vô nghĩa, bấm '⚖️ Phản đối'.",
      "Trọng tài là từ điển tiếng Việt: nếu từ đó KHÔNG có trong từ điển, người nối sai phải nối lại và bị TRỪ 5 giây mỗi lượt từ đó về sau.",
      "Nhưng nếu từ đó CÓ trong từ điển (phản đối sai), thì CHÍNH BẠN bị trừ 5 giây mỗi lượt. Vậy nên chỉ phản đối khi chắc chắn!",
      "Thời gian mỗi lượt không bao giờ xuống dưới 5 giây. Ai hết giờ hoặc chịu thua sẽ thua.",
    ],
    create,
  });
})();
