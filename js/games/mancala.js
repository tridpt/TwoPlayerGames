/* Mancala (Kalah) — chơi chung máy & online
   Bàn 14 hốc: hốc 0-5 của P1, kho 6 của P1; hốc 7-12 của P2, kho 13 của P2.
   Gieo sỏi ngược chiều kim đồng hồ, bỏ qua kho đối thủ. */
(function () {
  const STORE0 = 6;
  const STORE1 = 13;

  function create(ctx) {
    // 4 sỏi mỗi hốc, kho rỗng
    let pits = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
    let turn = 0; // 0 = P1 (hốc 0-5), 1 = P2 (hốc 7-12)
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "mnc-board";
    ctx.boardEl.appendChild(wrap);

    // kho P2 (bên trái)
    const store1El = makeStore("mnc-store store-p2");
    // khu giữa: 2 hàng hốc
    const mid = document.createElement("div");
    mid.className = "mnc-mid";
    const topRow = document.createElement("div");
    topRow.className = "mnc-row";
    const botRow = document.createElement("div");
    botRow.className = "mnc-row";
    mid.appendChild(topRow);
    mid.appendChild(botRow);
    // kho P1 (bên phải)
    const store0El = makeStore("mnc-store store-p1");

    wrap.appendChild(store1El.wrap);
    wrap.appendChild(mid);
    wrap.appendChild(store0El.wrap);

    const pitEls = {};
    // hàng trên: hốc P2 từ 12 -> 7 (trái sang phải)
    for (let i = 12; i >= 7; i--) topRow.appendChild(makePit(i));
    // hàng dưới: hốc P1 từ 0 -> 5
    for (let i = 0; i <= 5; i++) botRow.appendChild(makePit(i));

    function makeStore(cls) {
      const w = document.createElement("div");
      w.className = cls;
      const val = document.createElement("div");
      val.className = "mnc-store-val";
      w.appendChild(val);
      return { wrap: w, val };
    }

    function makePit(i) {
      const pit = document.createElement("div");
      pit.className = "mnc-pit";
      pit.dataset.idx = i;
      pit.addEventListener("click", () => onClick(i));
      const val = document.createElement("span");
      val.className = "mnc-pit-val";
      pit.appendChild(val);
      pitEls[i] = { pit, val };
      return pit;
    }

    function ownsPit(p, i) {
      return p === 0 ? (i >= 0 && i <= 5) : (i >= 7 && i <= 12);
    }
    function myStore(p) { return p === 0 ? STORE0 : STORE1; }
    function oppStore(p) { return p === 0 ? STORE1 : STORE0; }

    function onClick(i) {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      if (!ownsPit(turn, i) || pits[i] === 0) return;
      applyMove(i, false);
    }

    function applyMove(i, fromRemote) {
      if (over || !ownsPit(turn, i) || pits[i] === 0) return;

      if (!fromRemote && ctx.isOnline) ctx.sendMove(i);

      let stones = pits[i];
      pits[i] = 0;
      let idx = i;
      while (stones > 0) {
        idx = (idx + 1) % 14;
        if (idx === oppStore(turn)) continue; // bỏ qua kho đối thủ
        pits[idx]++;
        stones--;
      }

      // bắt sỏi: viên cuối rơi vào hốc trống của mình
      if (ownsPit(turn, idx) && pits[idx] === 1) {
        const opposite = 12 - idx;
        if (pits[opposite] > 0) {
          pits[myStore(turn)] += pits[opposite] + 1;
          pits[opposite] = 0;
          pits[idx] = 0;
        }
      }

      render();

      if (checkEnd()) return finish();

      // rơi vào kho của mình thì đi tiếp
      if (idx === myStore(turn)) {
        ctx.setStatus(`✨ Người chơi ${turn + 1} rơi vào kho — được đi tiếp!`);
        ctx.setTurn(turn);
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
    }

    function sideEmpty(p) {
      const range = p === 0 ? [0, 5] : [7, 12];
      for (let i = range[0]; i <= range[1]; i++) if (pits[i] > 0) return false;
      return true;
    }

    function checkEnd() { return sideEmpty(0) || sideEmpty(1); }

    function finish() {
      over = true;
      // dồn sỏi còn lại về kho tương ứng
      for (let i = 0; i <= 5; i++) { pits[STORE0] += pits[i]; pits[i] = 0; }
      for (let i = 7; i <= 12; i++) { pits[STORE1] += pits[i]; pits[i] = 0; }
      render();
      ctx.setTurn(-1);
      const a = pits[STORE0], b = pits[STORE1];
      if (a > b) { ctx.incScore(0); ctx.setStatus(`🎉 Người chơi 1 thắng ${a}–${b}!`); }
      else if (b > a) { ctx.incScore(1); ctx.setStatus(`🎉 Người chơi 2 thắng ${b}–${a}!`); }
      else ctx.setStatus(`🤝 Hòa ${a}–${b}!`);
    }

    function render() {
      for (let i = 0; i < 14; i++) {
        if (pitEls[i]) {
          pitEls[i].val.textContent = pits[i];
          pitEls[i].pit.classList.toggle("empty", pits[i] === 0);
          const playable = !over && ownsPit(turn, i) && pits[i] > 0 &&
            (!ctx.isOnline || turn === ctx.mySeat);
          pitEls[i].pit.classList.toggle("playable", playable);
        }
      }
      store0El.val.textContent = pits[STORE0];
      store1El.val.textContent = pits[STORE1];
    }

    function updateStatus() {
      ctx.setStatus(`Lượt Người chơi ${turn + 1} — chọn một hốc bên phía mình để gieo sỏi.`);
    }

    ctx.setNames("Người chơi 1 (dưới)", "Người chơi 2 (trên)");
    ctx.setTurn(0);
    render();
    ctx.setStatus("Chọn một hốc bên mình, gieo sỏi ngược chiều kim đồng hồ. Nhiều sỏi trong kho hơn sẽ thắng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "mancala",
    name: "Mancala (Ô Ăn Quan)",
    emoji: "🫘",
    description: "Gieo sỏi vòng quanh các hốc, bắt sỏi đối thủ. Ai gom nhiều sỏi về kho hơn sẽ thắng.",
    onlineReady: true,
    howTo: [
      "Mỗi người có 6 hốc nhỏ ở phía mình và 1 kho lớn. Người chơi 1 ở hàng dưới (kho bên phải), Người chơi 2 ở hàng trên (kho bên trái).",
      "Đến lượt, chọn một hốc bên phía mình còn sỏi: nhặt hết sỏi rồi rải lần lượt mỗi hốc 1 viên theo ngược chiều kim đồng hồ.",
      "Khi rải qua kho của mình thì bỏ 1 viên vào đó, nhưng bỏ qua (không bỏ vào) kho đối thủ.",
      "Nếu viên cuối rơi đúng vào KHO của mình, bạn được đi thêm một lượt nữa.",
      "Nếu viên cuối rơi vào một hốc TRỐNG bên phía mình, bạn bắt viên đó cùng toàn bộ sỏi ở hốc đối diện, đưa hết vào kho mình.",
      "Khi một bên hết sỏi ở các hốc, sỏi còn lại của bên kia được dồn về kho của họ. Ai nhiều sỏi trong kho hơn sẽ thắng.",
    ],
    create,
  });
})();
