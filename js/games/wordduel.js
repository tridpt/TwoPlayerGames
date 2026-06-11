/* Ghép Từ Đối Kháng (Word Duel) — chơi chung máy, ĐẤU MÁY và ONLINE
   Có một KHO ÂM TIẾT chung (lưới). Thay nhau chọn 2+ âm tiết để ghép thành một
   TỪ tiếng Việt hợp lệ (có trong từ điển window.VI_DICT) và ăn điểm. Âm tiết đã
   dùng được thay bằng âm tiết mới. Hết kho mà không ai ghép được nữa → ai nhiều
   điểm hơn thắng.

   Đồng bộ online: kho âm tiết sinh TẤT ĐỊNH từ ctx.rng (chung seed) nên hai máy
   giống hệt; chỉ gửi hành động (chỉ số ô đã chọn / bỏ lượt) qua relay. */
(function () {
  const POOL = 9;        // số ô trong lưới

  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, " ").trim(); }

  function create(ctx) {
    const o = ctx.options || {};
    const WIN = o.target ? Number(o.target) : 12;
    const dict = (typeof window !== "undefined" && window.VI_DICT) ? window.VI_DICT : new Set();

    // Tách từ điển: danh sách từ 2 âm tiết để dựng kho chắc chắn ghép được.
    const twoSylWords = [];
    for (const w of dict) {
      const parts = w.split(" ");
      if (parts.length === 2) twoSylWords.push(parts);
      if (twoSylWords.length >= 4000) break;
    }

    let score = [0, 0];
    let turn = ctx.isOnline ? ctx.firstSeat : 0;
    let over = false;
    let passes = 0;
    let bag = [];
    let pool = [];
    let lastWord = null;
    let selected = [];

    const root = document.createElement("div");
    root.className = "wd-root";
    ctx.boardEl.appendChild(root);
    let els = null;

    function buildBag() {
      const sylSet = [];
      const pick = Math.min(60, twoSylWords.length);
      for (let i = 0; i < pick; i++) {
        const w = twoSylWords[Math.floor(ctx.rng() * twoSylWords.length)] || [];
        for (const s of w) sylSet.push(s);
      }
      for (let i = sylSet.length - 1; i > 0; i--) {
        const j = Math.floor(ctx.rng() * (i + 1));
        const t = sylSet[i]; sylSet[i] = sylSet[j]; sylSet[j] = t;
      }
      bag = sylSet;
    }

    function refillPool() {
      while (pool.length < POOL && bag.length) pool.push(bag.shift());
    }

    function isWord(syls) {
      if (syls.length < 2) return false;
      return dict.has(norm(syls.join(" ")));
    }

    function anyWordPossible() {
      for (let i = 0; i < pool.length; i++)
        for (let j = 0; j < pool.length; j++) {
          if (i !== j && isWord([pool[i], pool[j]])) return true;
        }
      return false;
    }

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    // Hành động: { k:"word", idx:[...] } | { k:"pass" }
    function applyMove(move, fromRemote) {
      if (over) return;
      if (move.k === "word") {
        const idx = move.idx.map(Number);
        if (idx.length < 2) return;
        if (idx.some((i) => i < 0 || i >= pool.length) || new Set(idx).size !== idx.length) return;
        const syls = idx.map((i) => pool[i]);
        if (!isWord(syls)) return;
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ k: "word", idx });

        const pts = syls.length;
        score[turn] += pts;
        passes = 0;
        ctx.sound("win");
        const sortedDesc = [...idx].sort((a, b) => b - a);
        for (const i of sortedDesc) pool.splice(i, 1);
        refillPool();
        lastWord = { by: turn, text: syls.join(" "), pts };
        selected = [];

        if (WIN > 0 && score[turn] >= WIN) { finish(turn); return; }
        if (!bag.length && !anyWordPossible()) { finishByScore(); return; }
        turn = 1 - turn;
        ctx.setTurn(turn);
        render(); updateStatus();
      } else if (move.k === "pass") {
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ k: "pass" });
        passes++;
        selected = [];
        ctx.sound("place");
        if (passes >= 2) { finishByScore(); return; }
        turn = 1 - turn;
        ctx.setTurn(turn);
        render(); updateStatus();
      }
    }

    function finish(winner) {
      over = true;
      if (winner >= 0) ctx.incScore(winner);
      ctx.setTurn(-1);
      ctx.sound("win");
      render();
      ctx.setStatus(winner < 0
        ? ctx.t(`🤝 Hòa ${score[0]}–${score[1]}!`, `🤝 Draw ${score[0]}–${score[1]}!`)
        : ctx.t(`🎉 Người chơi ${winner + 1} thắng ${score[0]}–${score[1]}!`, `🎉 Player ${winner + 1} wins ${score[0]}–${score[1]}!`));
    }
    function finishByScore() {
      const w = score[0] === score[1] ? -1 : (score[0] > score[1] ? 0 : 1);
      finish(w);
    }

    // ----- AI: tìm một cặp ghép được trong pool; khó hơn thì ưu tiên từ "dài/hiếm" -----
    function aiMove(level) {
      if (over) return null;
      const pairs = [];
      for (let i = 0; i < pool.length; i++)
        for (let j = 0; j < pool.length; j++) {
          if (i !== j && isWord([pool[i], pool[j]])) pairs.push([i, j]);
        }
      if (!pairs.length) return { k: "pass" };
      // easy: đôi khi bỏ lỡ; hard: luôn chơi
      if (level === "easy" && Math.random() < 0.35) return { k: "pass" };
      const pick = pairs[Math.floor(ctx.rng() * pairs.length)];
      return { k: "word", idx: pick };
    }

    // ----- Giao diện -----
    function buildShell() {
      root.innerHTML =
        `<div class="wd-head" id="wdHead"></div>` +
        `<div class="wd-last" id="wdLast"></div>` +
        `<div class="wd-pool" id="wdPool"></div>` +
        `<div class="wd-sel" id="wdSel"></div>` +
        `<div class="wd-acts" id="wdActs"></div>`;
      els = {
        head: root.querySelector("#wdHead"),
        last: root.querySelector("#wdLast"),
        pool: root.querySelector("#wdPool"),
        sel: root.querySelector("#wdSel"),
        acts: root.querySelector("#wdActs"),
      };
    }

    function render() {
      if (!els) buildShell();
      const me = ctx.isOnline ? ctx.mySeat : turn;
      els.head.innerHTML =
        `<div class="wd-pinfo p1 ${turn === 0 && !over ? "active" : ""}">` +
          `<span>🟥 P1${me === 0 ? ctx.t(" (bạn)", " (you)") : ""}</span><b>${score[0]}</b>` +
        `</div>` +
        `<div class="wd-goal">${WIN > 0 ? ctx.t(`về đích ${WIN}`, `to ${WIN}`) : ""}</div>` +
        `<div class="wd-pinfo p2 ${turn === 1 && !over ? "active" : ""}">` +
          `<span>🟦 P2${me === 1 ? ctx.t(" (bạn)", " (you)") : ""}</span><b>${score[1]}</b>` +
        `</div>`;

      els.last.innerHTML = lastWord
        ? ctx.t(`Vừa ghép: <b>${lastWord.text}</b> (+${lastWord.pts}) bởi P${lastWord.by + 1}`,
                `Last word: <b>${lastWord.text}</b> (+${lastWord.pts}) by P${lastWord.by + 1}`)
        : ctx.t("Chọn các ô để ghép thành một từ tiếng Việt có nghĩa.", "Pick tiles to form a valid Vietnamese word.");

      els.pool.innerHTML = pool.map((s, i) =>
        `<button type="button" class="wd-tile${selected.includes(i) ? " on" : ""}" data-i="${i}">` +
          `${selected.includes(i) ? `<span class="wd-order">${selected.indexOf(i) + 1}</span>` : ""}${s}` +
        `</button>`).join("");

      const preview = selected.map((i) => pool[i]).join(" ");
      const valid = isWord(selected.map((i) => pool[i]));
      els.sel.innerHTML = selected.length
        ? `<span class="wd-prev${valid ? " ok" : ""}">${preview}</span>` +
          (valid ? `<span class="wd-ok">✓ ${ctx.t("từ hợp lệ +", "valid word +")}${selected.length}</span>` : `<span class="wd-no">${ctx.t("chưa thành từ", "not a word yet")}</span>`)
        : `<span class="wd-prev empty">${ctx.t("(chọn ô bên trên)", "(pick tiles above)")}</span>`;

      renderActs(valid);
    }

    function renderActs(valid) {
      if (over) { els.acts.innerHTML = ""; return; }
      if (!canPlay()) { els.acts.innerHTML = `<div class="wd-wait">${ctx.t("Chờ đối thủ...", "Waiting for opponent...")}</div>`; return; }
      els.acts.innerHTML =
        `<button type="button" class="btn wd-clear">${ctx.t("↺ Bỏ chọn", "↺ Clear")}</button>` +
        `<button type="button" class="btn primary wd-go${valid ? "" : " disabled"}">${ctx.t("✓ Ghép từ", "✓ Make word")}</button>` +
        `<button type="button" class="btn wd-pass">${ctx.t("⤳ Bỏ lượt", "⤳ Pass")}</button>`;
      wireActs();
    }

    function wireActs() {
      els.pool.querySelectorAll(".wd-tile").forEach((b) => {
        b.addEventListener("click", () => {
          if (!canPlay()) return;
          const i = Number(b.dataset.i);
          const at = selected.indexOf(i);
          if (at >= 0) selected.splice(at, 1);
          else selected.push(i);
          render();
        });
      });
      const clr = els.acts.querySelector(".wd-clear");
      if (clr) clr.addEventListener("click", () => { selected = []; render(); });
      const go = els.acts.querySelector(".wd-go");
      if (go) go.addEventListener("click", () => {
        if (!isWord(selected.map((i) => pool[i]))) return;
        applyMove({ k: "word", idx: selected.slice() }, false);
      });
      const pass = els.acts.querySelector(".wd-pass");
      if (pass) pass.addEventListener("click", () => applyMove({ k: "pass" }, false));
    }

    function updateStatus() {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) ctx.setStatus(ctx.t("Đối thủ đang ghép từ...", "Opponent is forming a word..."));
      else ctx.setStatus(ctx.t(`Lượt bạn: chọn các ô để ghép thành từ rồi bấm "Ghép từ". Không ghép được thì "Bỏ lượt".`,
        `Your turn: pick tiles to form a word then "Make word". Stuck? "Pass".`));
    }

    // khởi tạo
    buildBag();
    refillPool();
    // đảm bảo pool mở màn có ít nhất một nước (nếu xui thì bơm thêm)
    let guard = 0;
    while (!anyWordPossible() && bag.length && guard++ < 20) { pool.push(bag.shift()); }
    ctx.setTurn(turn);
    render();
    updateStatus();

    function destroy() {}
    return { applyMove, aiMove, destroy };
  }

  window.GameRegistry.register({
    id: "wordduel",
    name: "Ghép Từ Đối Kháng",
    emoji: "🔤",
    description: "Đấu vốn từ tiếng Việt: từ một kho âm tiết chung, thay nhau chọn các âm tiết để ghép thành từ có nghĩa và ăn điểm. Âm tiết dùng xong được thay mới. Ai đạt điểm mốc trước (hoặc nhiều điểm hơn khi hết kho) sẽ thắng. Chơi chung máy, đấu máy hoặc online.",
    onlineReady: true,
    supportsAI: true,
    options: [
      {
        id: "target", label: "Điểm để thắng", default: 12,
        choices: [
          { value: 8, label: "8 (nhanh)" },
          { value: 12, label: "12 (chuẩn)" },
          { value: 18, label: "18 (dài)" },
          { value: 0, label: "Chơi tới khi hết kho" },
        ],
      },
    ],
    howTo: [
      "Trên màn có một KHO ÂM TIẾT chung (lưới các ô chữ). Hai người dùng chung kho này.",
      "Đến lượt, bạn bấm chọn 2 ô (hoặc hơn) theo thứ tự để ghép thành một TỪ tiếng Việt CÓ NGHĨA, ví dụ: 'bình' + 'yên' = 'bình yên'.",
      "Khu xem trước hiện từ bạn đang ghép: ✓ xanh nghĩa là từ hợp lệ (có trong từ điển), khi đó bấm 'Ghép từ' để ăn điểm (mỗi âm tiết = 1 điểm).",
      "Các ô vừa dùng biến mất và được thay bằng âm tiết mới từ kho.",
      "Nếu không ghép được, bấm 'Bỏ lượt'. Cả hai cùng bỏ lượt liên tiếp thì ván kết thúc.",
      "Người đạt điểm mốc trước sẽ thắng; nếu chơi tới khi hết kho thì ai nhiều điểm hơn thắng. Chơi chung máy, đấu với máy, hoặc online.",
    ],
    create,
  });
})();
