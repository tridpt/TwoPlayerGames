/* Đua Bấm Nút (Reaction Duel) — chơi chung máy, thời gian thực
   Chờ tín hiệu XANH rồi bấm thật nhanh. Bấm trước khi đèn xanh = phạm quy, thua vòng.
   P1: phím A (hoặc bấm panel trái). P2: phím L (hoặc bấm panel phải).
   Ai thắng đủ số vòng định trước sẽ vô địch. */
(function () {
  function create(ctx) {
    const o = ctx.options || {};
    const WIN_ROUNDS = o.rounds || 3;
    const MIN_WAIT = (o.wait === "fast" ? 700 : o.wait === "slow" ? 2000 : 1200);
    const MAX_WAIT = MIN_WAIT + (o.wait === "fast" ? 1500 : o.wait === "slow" ? 4000 : 2800);

    let score = [0, 0];
    let over = false;
    let phase = "idle";      // idle | waiting | go | done
    let signalAt = 0;        // mốc thời gian đèn chuyển xanh
    let goTimer = null;
    let winnerThisRound = -1;
    let rt = [-1, -1];       // thời gian phản xạ (ms) mỗi người trong vòng

    const root = document.createElement("div");
    root.className = "rd2-root";
    root.innerHTML =
      `<div class="rd2-arena">` +
        `<button type="button" class="rd2-pad rd2-p1" data-seat="0" aria-label="${ctx.t("Vùng bấm Người chơi 1", "Player 1 tap zone")}">` +
          `<span class="rd2-pad-name">P1</span><span class="rd2-pad-key">A</span><span class="rd2-pad-rt" data-rt="0"></span>` +
        `</button>` +
        `<div class="rd2-light" id="rd2Light"><span class="rd2-light-text"></span></div>` +
        `<button type="button" class="rd2-pad rd2-p2" data-seat="1" aria-label="${ctx.t("Vùng bấm Người chơi 2", "Player 2 tap zone")}">` +
          `<span class="rd2-pad-name">P2</span><span class="rd2-pad-key">L</span><span class="rd2-pad-rt" data-rt="1"></span>` +
        `</button>` +
      `</div>` +
      `<div class="rd2-score"><b class="rd2-s1">0</b><span class="rd2-vs">${ctx.t("vòng", "round")} 1/${WIN_ROUNDS}</span><b class="rd2-s2">0</b></div>` +
      `<button type="button" class="btn primary rd2-start">${ctx.t("Bắt đầu vòng", "Start round")}</button>`;
    ctx.boardEl.appendChild(root);

    const lightEl = root.querySelector("#rd2Light");
    const lightText = root.querySelector(".rd2-light-text");
    const startBtn = root.querySelector(".rd2-start");
    const s1El = root.querySelector(".rd2-s1");
    const s2El = root.querySelector(".rd2-s2");
    const vsEl = root.querySelector(".rd2-vs");
    const rtEls = [root.querySelector('[data-rt="0"]'), root.querySelector('[data-rt="1"]')];
    const pads = [root.querySelector(".rd2-p1"), root.querySelector(".rd2-p2")];

    function setLight(cls, text) {
      lightEl.className = "rd2-light " + cls;
      lightText.textContent = text;
    }

    function startRound() {
      if (over || phase === "waiting" || phase === "go") return;
      winnerThisRound = -1;
      rt = [-1, -1];
      rtEls.forEach((e) => (e.textContent = ""));
      pads.forEach((p) => p.classList.remove("foul", "win", "lose"));
      startBtn.disabled = true;
      phase = "waiting";
      setLight("wait", ctx.t("Chờ đèn XANH...", "Wait for GREEN..."));
      ctx.setStatus(ctx.t("Đừng bấm sớm! Bấm trước khi xanh sẽ thua vòng.", "Don't jump the gun! Tapping before green loses the round."));
      const delay = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
      goTimer = setTimeout(() => {
        phase = "go";
        signalAt = Date.now();
        setLight("go", ctx.t("BẤM NGAY!", "TAP NOW!"));
        ctx.sound("notify");
      }, delay);
    }

    function press(seat) {
      if (over) return;
      if (phase === "idle" || phase === "done") return;
      if (phase === "waiting") {
        // bấm sớm -> phạm quy, đối thủ thắng vòng
        clearTimeout(goTimer);
        pads[seat].classList.add("foul");
        ctx.sound("miss");
        finishRound(1 - seat, true, seat);
        return;
      }
      if (phase === "go") {
        if (rt[seat] >= 0) return; // đã bấm rồi
        rt[seat] = Date.now() - signalAt;
        rtEls[seat].textContent = rt[seat] + "ms";
        ctx.sound("place");
        // người đầu tiên bấm hợp lệ thắng vòng (đối thủ chưa cần bấm)
        finishRound(seat, false, -1);
      }
    }

    function finishRound(winner, foul, foulSeat) {
      phase = "done";
      winnerThisRound = winner;
      score[winner]++;
      s1El.textContent = score[0];
      s2El.textContent = score[1];
      pads[winner].classList.add("win");
      pads[1 - winner].classList.add("lose");
      setLight("done", "");
      if (score[winner] >= WIN_ROUNDS) {
        over = true;
        ctx.incScore(winner);
        ctx.setTurn(-1);
        setLight("done", ctx.t(`🎉 P${winner + 1} vô địch!`, `🎉 P${winner + 1} wins!`));
        ctx.setStatus(ctx.t(`🎉 Người chơi ${winner + 1} thắng chung cuộc ${score[0]}–${score[1]}!`,
          `🎉 Player ${winner + 1} wins the match ${score[0]}–${score[1]}!`));
        startBtn.disabled = true;
        startBtn.textContent = ctx.t("Đã kết thúc", "Match over");
        return;
      }
      const reason = foul
        ? ctx.t(`P${foulSeat + 1} bấm sớm — P${winner + 1} thắng vòng.`, `P${foulSeat + 1} jumped early — P${winner + 1} takes the round.`)
        : ctx.t(`P${winner + 1} nhanh hơn (${rt[winner]}ms) — thắng vòng!`, `P${winner + 1} was faster (${rt[winner]}ms) — round won!`);
      vsEl.textContent = ctx.t("vòng", "round") + " " + (score[0] + score[1] + 1) + "/" + WIN_ROUNDS;
      ctx.setStatus(reason);
      startBtn.disabled = false;
      startBtn.textContent = ctx.t("Vòng tiếp theo", "Next round");
    }

    pads.forEach((pad) => {
      pad.addEventListener("click", () => press(Number(pad.getAttribute("data-seat"))));
    });
    startBtn.addEventListener("click", startRound);

    function onKey(e) {
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); press(0); }
      else if (k === "l") { e.preventDefault(); press(1); }
      else if (k === " " || k === "enter") {
        if (phase === "idle" || phase === "done") { e.preventDefault(); startRound(); }
      }
    }
    window.addEventListener("keydown", onKey);

    const cleanup = () => { clearTimeout(goTimer); window.removeEventListener("keydown", onKey); };
    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) { cleanup(); observer.disconnect(); }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    ctx.setTurn(-1);
    setLight("idle", ctx.t("Sẵn sàng", "Ready"));
    ctx.setStatus(ctx.t(`Bấm "Bắt đầu vòng". P1 dùng phím A, P2 dùng phím L. Chờ đèn XANH rồi bấm thật nhanh!`,
      `Press "Start round". P1 uses key A, P2 uses key L. Wait for GREEN then tap fast!`));

    function applyMove() {} // local-only
    function destroy() { cleanup(); observer.disconnect(); }
    return { applyMove, destroy };
  }

  window.GameRegistry.register({
    id: "reactionduel",
    name: "Đua Bấm Nút",
    emoji: "⚡",
    description: "Chờ đèn xanh rồi bấm thật nhanh — bấm sớm là thua. Đấu phản xạ thuần túy.",
    onlineReady: false,
    supportsAI: false,
    options: [
      {
        id: "rounds", label: "Số vòng để thắng", default: 3,
        choices: [
          { value: 2, label: "2 vòng (nhanh)" },
          { value: 3, label: "3 vòng" },
          { value: 5, label: "5 vòng" },
        ],
      },
      {
        id: "wait", label: "Độ trễ đèn xanh", default: "normal",
        choices: [
          { value: "fast", label: "Ngắn (gắt)" },
          { value: "normal", label: "Vừa" },
          { value: "slow", label: "Dài (hồi hộp)" },
        ],
      },
    ],
    howTo: [
      "Game chơi chung trên một thiết bị (không hỗ trợ online).",
      "Bấm \"Bắt đầu vòng\". Đèn sẽ ở trạng thái CHỜ (đỏ/cam) trong một khoảng thời gian ngẫu nhiên.",
      "Khi đèn chuyển XANH và hiện \"BẤM NGAY!\", hãy bấm thật nhanh: Người chơi 1 dùng phím A (hoặc chạm vùng trái), Người chơi 2 dùng phím L (hoặc chạm vùng phải).",
      "Ai bấm hợp lệ trước sẽ thắng vòng đó; thời gian phản xạ (ms) được hiển thị.",
      "CẢNH BÁO: nếu bấm TRƯỚC khi đèn xanh, bạn phạm quy và thua vòng ngay lập tức.",
      "Người đầu tiên thắng đủ số vòng đã chọn sẽ vô địch.",
    ],
    create,
  });
})();
