/* Đua Gõ Phím (Typing Race) — chơi chung máy, thời gian thực
   Cả hai cùng thấy MỘT chuỗi từ tiếng Việt giống nhau. Mỗi người gõ vào ô của
   mình; gõ đúng từ hiện tại (kèm dấu) thì sang từ kế. Ai gõ xong đủ số từ trước
   sẽ THẮNG. P1 dùng ô trên, P2 dùng ô dưới (mỗi người một bàn phím/về phe).
   (Bản chung máy: hai ô nhập trên cùng thiết bị — phù hợp luyện hoặc 2 bàn phím.) */
(function () {
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, " ").trim(); }

  function create(ctx) {
    const o = ctx.options || {};
    const COUNT = o.count ? Number(o.count) : 12;   // số từ phải gõ
    const dict = (typeof window !== "undefined" && window.VI_DICT) ? window.VI_DICT : new Set();

    // rút COUNT từ tất định từ từ điển
    const all = [];
    for (const w of dict) { all.push(w); if (all.length >= 5000) break; }
    const words = [];
    for (let i = 0; i < COUNT; i++) {
      words.push(all.length ? all[Math.floor(ctx.rng() * all.length)] : "tu " + (i + 1));
    }

    let idx = [0, 0];          // tiến độ mỗi người
    let over = false;
    let started = false;
    let startAt = 0;

    const root = document.createElement("div");
    root.className = "tr2-root";
    root.innerHTML =
      `<div class="tr2-prog"><div class="tr2-bar p1"><i id="tr2Bar0"></i></div>` +
        `<div class="tr2-bar p2"><i id="tr2Bar1"></i></div></div>` +
      `<div class="tr2-lane" data-seat="0">` +
        `<div class="tr2-head">🟥 P1 <span class="tr2-cnt" id="tr2Cnt0">0/${COUNT}</span></div>` +
        `<div class="tr2-word" id="tr2Word0"></div>` +
        `<input class="tr2-in" id="tr2In0" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ctx.t("Gõ từ rồi nhấn Space/Enter", "Type the word then Space/Enter")}" />` +
      `</div>` +
      `<div class="tr2-lane" data-seat="1">` +
        `<div class="tr2-head">🟦 P2 <span class="tr2-cnt" id="tr2Cnt1">0/${COUNT}</span></div>` +
        `<div class="tr2-word" id="tr2Word1"></div>` +
        `<input class="tr2-in" id="tr2In1" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ctx.t("Gõ từ rồi nhấn Space/Enter", "Type the word then Space/Enter")}" />` +
      `</div>` +
      `<button type="button" class="btn primary tr2-start">${ctx.t("Bắt đầu đua", "Start race")}</button>`;
    ctx.boardEl.appendChild(root);

    const ins = [root.querySelector("#tr2In0"), root.querySelector("#tr2In1")];
    const wordEls = [root.querySelector("#tr2Word0"), root.querySelector("#tr2Word1")];
    const cntEls = [root.querySelector("#tr2Cnt0"), root.querySelector("#tr2Cnt1")];
    const bars = [root.querySelector("#tr2Bar0"), root.querySelector("#tr2Bar1")];
    const startBtn = root.querySelector(".tr2-start");

    function renderWord(seat) {
      const i = idx[seat];
      if (i >= words.length) { wordEls[seat].innerHTML = `<span class="tr2-done">✓ ${ctx.t("Xong!", "Done!")}</span>`; return; }
      // hiện từ hiện tại + vài từ kế mờ dần
      const cur = words[i];
      const nextW = words.slice(i + 1, i + 3).join(" ");
      wordEls[seat].innerHTML = `<b class="tr2-cur">${cur}</b>` + (nextW ? ` <span class="tr2-next">${nextW}</span>` : "");
      cntEls[seat].textContent = i + "/" + words.length;
      bars[seat].style.width = Math.round(i / words.length * 100) + "%";
    }

    function checkInput(seat) {
      if (over || !started) { ins[seat].value = ""; return; }
      const typed = norm(ins[seat].value);
      const target = norm(words[idx[seat]] || "");
      if (!typed) return;
      // chấp nhận khi gõ đúng đủ từ (so khớp toàn bộ)
      if (typed === target) {
        idx[seat]++;
        ins[seat].value = "";
        ins[seat].classList.remove("wrong");
        ctx.sound("place");
        renderWord(seat);
        if (idx[seat] >= words.length) finish(seat);
      } else if (!target.startsWith(typed)) {
        // gõ sai hướng -> báo đỏ
        ins[seat].classList.add("wrong");
      } else {
        ins[seat].classList.remove("wrong");
      }
    }

    function submit(seat) {
      // nhấn Space/Enter: nếu đúng thì qua từ, sai thì rung nhẹ
      const typed = norm(ins[seat].value);
      const target = norm(words[idx[seat]] || "");
      if (typed === target) { checkInput(seat); }
      else { ins[seat].classList.add("wrong"); ctx.sound("miss"); }
    }

    function finish(winner) {
      over = true;
      ctx.incScore(winner);
      ctx.setTurn(-1);
      ctx.sound("win");
      const secs = ((Date.now() - startAt) / 1000).toFixed(1);
      ctx.setStatus(ctx.t(`🎉 Người chơi ${winner + 1} gõ xong trước trong ${secs}s — thắng!`,
        `🎉 Player ${winner + 1} finished first in ${secs}s — wins!`));
      ins.forEach((e) => (e.disabled = true));
      startBtn.disabled = true;
      startBtn.textContent = ctx.t("Đã kết thúc", "Race over");
    }

    function startRace() {
      if (started) return;
      started = true; over = false;
      idx = [0, 0];
      startAt = Date.now();
      ins.forEach((e, s) => { e.disabled = false; e.value = ""; renderWord(s); });
      ins[0].focus();
      startBtn.disabled = true;
      startBtn.textContent = ctx.t("Đang đua...", "Racing...");
      ctx.sound("notify");
      ctx.setStatus(ctx.t("Đua! Gõ đúng từng từ, nhấn Space/Enter để sang từ kế.", "Race! Type each word, press Space/Enter for the next."));
    }

    ins.forEach((inp, seat) => {
      inp.addEventListener("input", () => checkInput(seat));
      inp.addEventListener("keydown", (e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); submit(seat); }
      });
    });
    startBtn.addEventListener("click", startRace);

    ins.forEach((e) => (e.disabled = true));
    renderWord(0); renderWord(1);
    ctx.setTurn(-1);
    ctx.setStatus(ctx.t(`Bấm "Bắt đầu đua". Hai người gõ vào ô của mình; ai gõ đúng đủ ${COUNT} từ trước sẽ thắng. Nhớ gõ cả dấu!`,
      `Press "Start race". Each player types in their box; first to correctly type all ${COUNT} words wins. Type the accents too!`));

    function applyMove() {}
    function destroy() {}
    return { applyMove, destroy };
  }

  window.GameRegistry.register({
    id: "typingrace",
    name: "Đua Gõ Phím",
    emoji: "⌨️",
    description: "Hai người đua gõ đúng các từ tiếng Việt — ai gõ xong đủ số từ trước thì thắng.",
    onlineReady: false,
    supportsAI: false,
    options: [
      {
        id: "count", label: "Số từ phải gõ", default: 12,
        choices: [
          { value: 8, label: "8 từ (nhanh)" },
          { value: 12, label: "12 từ" },
          { value: 20, label: "20 từ (dài)" },
        ],
      },
    ],
    howTo: [
      "Game chơi chung trên một thiết bị (không hỗ trợ online) — hợp khi mỗi người một bàn phím, hoặc luân phiên luyện tốc độ.",
      "Bấm \"Bắt đầu đua\". Cả hai cùng nhận một chuỗi từ tiếng Việt giống nhau.",
      "Mỗi người gõ vào ô của mình: Người chơi 1 ô trên, Người chơi 2 ô dưới. Gõ ĐÚNG từ đang hiển thị (kèm dấu) rồi nhấn Space/Enter để sang từ kế.",
      "Gõ sai hướng thì ô chuyển đỏ để báo; sửa lại cho khớp.",
      "Ai gõ đúng hết toàn bộ số từ trước sẽ thắng; thời gian hoàn thành được hiển thị.",
    ],
    create,
  });
})();
