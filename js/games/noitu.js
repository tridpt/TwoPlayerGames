/* Nối Từ — chơi chung máy & ONLINE (theo lượt, có đồng hồ đếm ngược)
   Mỗi người nhập một từ ghép 2 tiếng, bắt đầu bằng TIẾNG CUỐI của từ trước.
   Không được lặp từ đã dùng. Hết giờ hoặc bí thì thua.
   Nước đi: { kind:"word", phrase } | { kind:"timeout" }.
   Lưu ý: tính đúng/sai nghĩa của từ theo "luật danh dự" (không có từ điển đầy đủ);
   chỉ kiểm tra định dạng 2 tiếng, nối đúng tiếng, và không lặp. */
(function () {
  // vài từ mở màn gợi ý (chọn tất định theo seed để 2 máy giống nhau)
  const STARTERS = [
    "học sinh", "bầu trời", "con đường", "mặt trời", "hoa hồng",
    "xinh đẹp", "vui vẻ", "bình minh", "quê hương", "tình bạn",
  ];

  function norm(s) {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
  }
  function syllables(s) { return norm(s).split(" ").filter(Boolean); }

  function create(ctx) {
    const o = ctx.options || {};
    const TIME = o.time || 20; // giây mỗi lượt (0 = không giới hạn)

    const used = new Set();
    let turn = 0;
    let over = false;
    let lastWord = null;     // tiếng cuối cần nối tiếp
    let timerId = null;
    let timeLeft = TIME;

    const root = document.createElement("div");
    root.className = "nt-root";
    root.innerHTML =
      `<div class="nt-need" id="ntNeed"></div>` +
      `<div class="nt-timer" id="ntTimer"></div>` +
      `<div class="nt-inputrow">` +
      `<input class="nt-input" id="ntInput" placeholder="nhập từ 2 tiếng..." autocomplete="off">` +
      `<button class="btn primary" id="ntSend">Nối</button></div>` +
      `<p class="nt-err" id="ntErr"></p>` +
      `<div class="nt-chain" id="ntChain"></div>`;
    ctx.boardEl.appendChild(root);

    const needEl = root.querySelector("#ntNeed");
    const timerEl = root.querySelector("#ntTimer");
    const input = root.querySelector("#ntInput");
    const sendBtn = root.querySelector("#ntSend");
    const errEl = root.querySelector("#ntErr");
    const chainEl = root.querySelector("#ntChain");

    // từ mở màn cố định theo seed
    const opener = STARTERS[Math.floor(ctx.rng() * STARTERS.length)];

    function myTurn() { return !ctx.isOnline || turn === ctx.mySeat; }

    function startTimer() {
      stopTimer();
      if (TIME <= 0) { timerEl.textContent = ""; return; }
      timeLeft = TIME;
      renderTimer();
      timerId = setInterval(() => {
        timeLeft--;
        renderTimer();
        if (timeLeft <= 0) {
          stopTimer();
          // chỉ người đang tới lượt (và là mình, nếu online) mới phát timeout
          if (myTurn()) applyMove({ kind: "timeout" }, false);
        }
      }, 1000);
    }
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function renderTimer() {
      timerEl.textContent = TIME > 0 ? `⏱️ ${timeLeft}s` : "";
      timerEl.classList.toggle("low", timeLeft <= 5);
    }

    function validate(phrase) {
      const sy = syllables(phrase);
      if (sy.length !== 2) return "Phải là từ GỒM 2 TIẾNG (ví dụ: học sinh).";
      if (lastWord && sy[0] !== lastWord) return `Phải bắt đầu bằng tiếng "${lastWord}".`;
      const key = sy.join(" ");
      if (used.has(key)) return "Từ này đã được dùng rồi.";
      return null;
    }

    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

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
        return endGame(1 - turn, `Người chơi ${turn + 1} hết giờ`);
      }

      if (move.kind === "word") {
        const sy = syllables(move.phrase);
        // kiểm tra lại (phòng nước từ xa)
        if (sy.length !== 2) return;
        if (lastWord && sy[0] !== lastWord) return;
        const key = sy.join(" ");
        if (used.has(key)) return;

        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);

        used.add(key);
        addChainWord(key, turn);
        lastWord = sy[1];
        ctx.sound("place");
        turn = 1 - turn;
        ctx.setTurn(turn);
        startTimer();
        updateUI();
      }
    }

    function addChainWord(phrase, who) {
      const item = document.createElement("span");
      item.className = "nt-word " + (who === 0 ? "p1" : "p2");
      item.textContent = phrase;
      chainEl.appendChild(item);
      chainEl.scrollTop = chainEl.scrollHeight;
    }

    function endGame(winner, reason) {
      over = true;
      stopTimer();
      ctx.setTurn(-1);
      input.disabled = true; sendBtn.disabled = true;
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
      if (mine) input.focus();
      ctx.setStatus(`Lượt Người chơi ${turn + 1} nối từ.`);
    }

    // nút "bí, chịu thua" cho người đang tới lượt
    const giveBtn = document.createElement("button");
    giveBtn.className = "btn nt-give";
    giveBtn.textContent = "🏳️ Bí, chịu thua";
    giveBtn.addEventListener("click", () => {
      if (!myTurn() || over) return;
      applyMove({ kind: "timeout" }, false);
    });
    root.querySelector(".nt-inputrow").appendChild(giveBtn);

    ctx.setTurn(0);
    updateUI();
    startTimer();
    ctx.setStatus("Nối từ 2 tiếng, bắt đầu bằng tiếng cuối của từ trước. Hết giờ hoặc bí là thua!");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "noitu",
    name: "Nối Từ",
    emoji: "🔤",
    description: "Nối từ ghép 2 tiếng theo tiếng cuối của từ trước. Hết giờ hoặc bí thì thua.",
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
      "Người chơi 1 mở màn bằng một từ ghép 2 tiếng (ví dụ: 'học sinh').",
      "Người tiếp theo phải nối bằng từ 2 tiếng bắt đầu bằng TIẾNG CUỐI của từ trước (ví dụ sau 'học sinh' → 'sinh viên').",
      "Không được dùng lại từ đã xuất hiện trong chuỗi.",
      "Mỗi lượt có đồng hồ đếm ngược — hết giờ là thua. Bí thì bấm '🏳️ Bí, chịu thua'.",
      "Lưu ý: trò chơi tin tưởng người chơi về nghĩa của từ (không có từ điển kiểm tra tự động) — chơi đẹp nhé!",
    ],
    create,
  });
})();
