/* Yahtzee — xúc xắc, chơi chung máy & ONLINE
   Mỗi lượt: gieo 5 xúc xắc tối đa 3 lần (giữ lại viên ưng ý), rồi chọn 1 ô điểm.
   13 ô điểm, ai tổng điểm cao hơn khi lấp hết sẽ thắng.
   Nước đi: { kind:"roll", dice } (mảng 5 số mới) | { kind:"score", cat }.
   Người gieo tự random rồi gửi kết quả cho đối thủ. */
(function () {
  const CATS = [
    { id: "ones", name: "Số 1", fn: (d) => sumOf(d, 1) },
    { id: "twos", name: "Số 2", fn: (d) => sumOf(d, 2) },
    { id: "threes", name: "Số 3", fn: (d) => sumOf(d, 3) },
    { id: "fours", name: "Số 4", fn: (d) => sumOf(d, 4) },
    { id: "fives", name: "Số 5", fn: (d) => sumOf(d, 5) },
    { id: "sixes", name: "Số 6", fn: (d) => sumOf(d, 6) },
    { id: "three", name: "3 giống nhau", fn: (d) => ofAKind(d, 3) ? sum(d) : 0 },
    { id: "four", name: "4 giống nhau", fn: (d) => ofAKind(d, 4) ? sum(d) : 0 },
    { id: "full", name: "Cù lũ (Full House)", fn: (d) => fullHouse(d) ? 25 : 0 },
    { id: "small", name: "Sảnh nhỏ (4 liên tiếp)", fn: (d) => straight(d, 4) ? 30 : 0 },
    { id: "large", name: "Sảnh lớn (5 liên tiếp)", fn: (d) => straight(d, 5) ? 40 : 0 },
    { id: "yahtzee", name: "Yahtzee (5 giống)", fn: (d) => ofAKind(d, 5) ? 50 : 0 },
    { id: "chance", name: "May rủi (tổng)", fn: (d) => sum(d) },
  ];

  function counts(d) { const c = [0,0,0,0,0,0,0]; d.forEach((v) => c[v]++); return c; }
  function sum(d) { return d.reduce((a, b) => a + b, 0); }
  function sumOf(d, n) { return d.filter((v) => v === n).length * n; }
  function ofAKind(d, n) { return counts(d).some((c) => c >= n); }
  function fullHouse(d) { const c = counts(d).filter((x) => x > 0).sort(); return (c.length === 2 && c[0] === 2 && c[1] === 3); }
  function straight(d, len) {
    const s = [...new Set(d)].sort((a, b) => a - b);
    let best = 1, run = 1;
    for (let i = 1; i < s.length; i++) {
      if (s[i] === s[i - 1] + 1) { run++; best = Math.max(best, run); } else run = 1;
    }
    return best >= len;
  }

  function create(ctx) {
    const DICE_FACE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let turn = 0;
    let over = false;
    let dice = [1, 1, 1, 1, 1];
    let held = [false, false, false, false, false];
    let rollsLeft = 3;
    let rolledThisTurn = false;
    // bảng điểm: scores[player][catId] = số | undefined(chưa điền)
    const scores = [{}, {}];

    const root = document.createElement("div");
    root.className = "yz-root";
    root.innerHTML =
      `<div class="yz-dice" id="yzDice"></div>` +
      `<div class="yz-actions">` +
      `<button class="btn primary" id="yzRoll">🎲 Gieo (3)</button>` +
      `<span class="yz-hint" id="yzHint">Bấm vào xúc xắc để giữ lại trước khi gieo tiếp.</span>` +
      `</div>` +
      `<div class="yz-table" id="yzTable"></div>`;
    ctx.boardEl.appendChild(root);

    const diceEl = root.querySelector("#yzDice");
    const rollBtn = root.querySelector("#yzRoll");
    const hintEl = root.querySelector("#yzHint");
    const tableEl = root.querySelector("#yzTable");

    // dựng 5 ô xúc xắc
    const dieEls = [];
    for (let i = 0; i < 5; i++) {
      const d = document.createElement("div");
      d.className = "yz-die";
      const idx = i;
      d.addEventListener("click", () => toggleHold(idx));
      diceEl.appendChild(d);
      dieEls.push(d);
    }

    // dựng bảng điểm
    const rowEls = {};
    CATS.forEach((cat) => {
      const row = document.createElement("div");
      row.className = "yz-row";
      row.innerHTML = `<span class="yz-cat">${cat.name}</span>` +
        `<span class="yz-v p1" data-p="0"></span>` +
        `<span class="yz-v p2" data-p="1"></span>`;
      const c0 = row.querySelector('[data-p="0"]');
      const c1 = row.querySelector('[data-p="1"]');
      c0.addEventListener("click", () => chooseCat(cat.id, 0));
      c1.addEventListener("click", () => chooseCat(cat.id, 1));
      tableEl.appendChild(row);
      rowEls[cat.id] = { c0, c1 };
    });
    // hàng tổng
    const totalRow = document.createElement("div");
    totalRow.className = "yz-row yz-total";
    totalRow.innerHTML = `<span class="yz-cat">TỔNG</span>` +
      `<span class="yz-v p1" id="yzTot0">0</span>` +
      `<span class="yz-v p2" id="yzTot1">0</span>`;
    tableEl.appendChild(totalRow);

    function myTurn() { return !ctx.isOnline || turn === ctx.mySeat; }

    function toggleHold(i) {
      if (!myTurn() || over || !rolledThisTurn) return;
      held[i] = !held[i];
      renderDice();
    }

    rollBtn.addEventListener("click", () => {
      if (!myTurn() || over || rollsLeft <= 0) return;
      const nd = dice.map((v, i) => (rolledThisTurn && held[i]) ? v : 1 + Math.floor(Math.random() * 6));
      applyMove({ kind: "roll", dice: nd }, false);
    });

    function chooseCat(catId, player) {
      if (!myTurn() || over || player !== turn || !rolledThisTurn) return;
      if (scores[player][catId] !== undefined) return; // đã điền
      applyMove({ kind: "score", cat: catId }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;

      if (move.kind === "roll") {
        if (rollsLeft <= 0) return;
        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
        dice = move.dice.slice();
        rollsLeft--;
        rolledThisTurn = true;
        ctx.sound("select");
        renderDice();
        renderTable();
        rollBtn.textContent = `🎲 Gieo (${rollsLeft})`;
        rollBtn.disabled = rollsLeft <= 0 || !myTurn();
        hintEl.textContent = rollsLeft > 0
          ? "Giữ viên ưng ý rồi gieo tiếp, hoặc chọn một ô điểm."
          : "Hết lượt gieo — hãy chọn một ô điểm để ghi.";
        return;
      }

      if (move.kind === "score") {
        const cat = CATS.find((c) => c.id === move.cat);
        if (!cat || scores[turn][move.cat] !== undefined) return;
        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
        scores[turn][move.cat] = cat.fn(dice);
        ctx.sound("capture");
        renderTable();
        // hết bàn khi cả hai điền đủ 13 ô
        const done0 = Object.keys(scores[0]).length === CATS.length;
        const done1 = Object.keys(scores[1]).length === CATS.length;
        if (done0 && done1) return finish();
        nextTurn();
      }
    }

    function nextTurn() {
      turn = 1 - turn;
      dice = [1, 1, 1, 1, 1];
      held = [false, false, false, false, false];
      rollsLeft = 3;
      rolledThisTurn = false;
      rollBtn.textContent = "🎲 Gieo (3)";
      rollBtn.disabled = !myTurn();
      ctx.setTurn(turn);
      renderDice();
      renderTable();
      hintEl.textContent = "Bấm vào xúc xắc để giữ lại trước khi gieo tiếp.";
      ctx.setStatus(`Lượt Người chơi ${turn + 1} — bấm Gieo để bắt đầu.`);
    }

    function total(p) {
      return CATS.reduce((s, c) => s + (scores[p][c.id] || 0), 0);
    }

    function finish() {
      over = true;
      ctx.setTurn(-1);
      const a = total(0), b = total(1);
      if (a > b) { ctx.incScore(0); ctx.setStatus(`🎉 Người chơi 1 thắng ${a}–${b}!`); }
      else if (b > a) { ctx.incScore(1); ctx.setStatus(`🎉 Người chơi 2 thắng ${b}–${a}!`); }
      else ctx.setStatus(`🤝 Hòa ${a}–${b}!`);
      renderTable();
    }

    function renderDice() {
      dice.forEach((v, i) => {
        dieEls[i].textContent = DICE_FACE[v];
        dieEls[i].classList.toggle("held", rolledThisTurn && held[i]);
        dieEls[i].classList.toggle("rollable", rolledThisTurn && myTurn() && !over);
      });
    }

    function renderTable() {
      CATS.forEach((cat) => {
        [0, 1].forEach((p) => {
          const cell = p === 0 ? rowEls[cat.id].c0 : rowEls[cat.id].c1;
          const val = scores[p][cat.id];
          cell.classList.remove("filled", "preview", "pickable");
          if (val !== undefined) {
            cell.textContent = val;
            cell.classList.add("filled");
          } else if (p === turn && myTurn() && rolledThisTurn && !over) {
            // xem trước điểm nếu chọn ô này
            cell.textContent = cat.fn(dice);
            cell.classList.add("preview", "pickable");
          } else {
            cell.textContent = "";
          }
        });
      });
      root.querySelector("#yzTot0").textContent = total(0);
      root.querySelector("#yzTot1").textContent = total(1);
    }

    ctx.setTurn(0);
    renderDice();
    renderTable();
    rollBtn.disabled = !myTurn();
    ctx.setStatus("Lượt Người chơi 1 — bấm Gieo để bắt đầu (mỗi lượt gieo tối đa 3 lần).");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "yahtzee",
    name: "Yahtzee",
    emoji: "🎰",
    description: "Gieo 5 xúc xắc, ghi điểm theo 13 tổ hợp (cù lũ, sảnh, Yahtzee...). Ai tổng điểm cao hơn thắng.",
    onlineReady: true,
    howTo: [
      "Mỗi lượt bạn được gieo 5 xúc xắc tối đa 3 lần. Sau mỗi lần gieo, bấm vào viên xúc xắc muốn GIỮ lại rồi gieo tiếp các viên còn lại.",
      "Sau khi gieo xong (hoặc dùng hết 3 lần), chọn MỘT ô điểm trong bảng để ghi — ô bạn chọn sẽ tính điểm theo xúc xắc hiện tại.",
      "Các ô số (1–6): tính tổng các viên có số đó. 3/4 giống nhau: tổng tất cả viên. Cù lũ: 25đ. Sảnh nhỏ (4 liên tiếp): 30đ. Sảnh lớn (5 liên tiếp): 40đ.",
      "Yahtzee (cả 5 viên giống nhau): 50đ. May rủi: tổng tất cả viên (dùng khi không có tổ hợp nào tốt).",
      "Mỗi ô chỉ điền được một lần. Khi cả hai đã điền hết 13 ô, ai tổng điểm cao hơn sẽ thắng.",
      "Ô có số mờ là điểm DỰ KIẾN nếu bạn chọn ô đó — bấm vào để chốt.",
    ],
    create,
  });
})();
