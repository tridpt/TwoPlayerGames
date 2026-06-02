/* Order & Chaos — chơi chung máy & online
   Bàn 6x6. Cả hai người đều được đặt X HOẶC O vào ô trống.
   Order (P1) thắng nếu tạo được 5 ký hiệu giống nhau liên tiếp.
   Chaos (P2) thắng nếu lấp đầy bàn mà không có hàng 5 nào. */
(function () {
  const N = 6;
  const NEED = 5;

  function create(ctx) {
    let board = Array.from({ length: N }, () => Array(N).fill(null)); // null | "X" | "O"
    let turn = 0; // 0 = Order, 1 = Chaos
    let chosen = "X"; // ký hiệu đang chọn để đặt
    let over = false;
    let count = 0;

    // Bộ chọn ký hiệu
    const picker = document.createElement("div");
    picker.className = "oc-picker";
    const labelEl = document.createElement("span");
    labelEl.className = "oc-picker-label";
    labelEl.textContent = "Đặt ký hiệu:";
    const xBtn = document.createElement("button");
    xBtn.className = "oc-sym-btn active";
    xBtn.textContent = "X";
    const oBtn = document.createElement("button");
    oBtn.className = "oc-sym-btn";
    oBtn.textContent = "O";
    xBtn.addEventListener("click", () => setSym("X"));
    oBtn.addEventListener("click", () => setSym("O"));
    picker.appendChild(labelEl);
    picker.appendChild(xBtn);
    picker.appendChild(oBtn);
    ctx.boardEl.appendChild(picker);

    function setSym(s) {
      chosen = s;
      xBtn.classList.toggle("active", s === "X");
      oBtn.classList.toggle("active", s === "O");
    }

    const grid = document.createElement("div");
    grid.className = "oc-board";
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    ctx.boardEl.appendChild(grid);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "oc-cell";
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        grid.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    function onClick(r, c) {
      if (over || board[r][c] !== null) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      applyMove({ r, c, sym: chosen }, false);
    }

    function applyMove(move, fromRemote) {
      const { r, c, sym } = move;
      if (over || board[r][c] !== null) return;
      board[r][c] = sym;
      count++;
      const el = cellEls[r][c];
      el.textContent = sym;
      el.classList.add(sym === "X" ? "x" : "o");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c, sym });

      // Order thắng nếu có hàng 5 (bất kể của ai đặt)
      const line = fiveLine(r, c, sym);
      if (line) {
        over = true;
        line.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
        ctx.incScore(0);
        ctx.setStatus("🎉 Order (Người chơi 1) thắng — tạo được hàng 5!");
        ctx.setTurn(-1);
        picker.classList.add("disabled");
        return;
      }
      if (count === N * N) {
        over = true;
        ctx.incScore(1);
        ctx.setStatus("🎉 Chaos (Người chơi 2) thắng — bàn đầy, không có hàng 5!");
        ctx.setTurn(-1);
        picker.classList.add("disabled");
        return;
      }

      turn = 1 - turn;
      setSym("X");
      ctx.setTurn(turn);
      updateStatus();
    }

    function fiveLine(r, c, sym) {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dr, dc] of dirs) {
        const cells = [[r, c]];
        let nr = r + dr, nc = c + dc;
        while (inB(nr, nc) && board[nr][nc] === sym) { cells.push([nr, nc]); nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (inB(nr, nc) && board[nr][nc] === sym) { cells.unshift([nr, nc]); nr -= dr; nc -= dc; }
        if (cells.length >= NEED) {
          // chỉ lấy đúng 5 ô liên tiếp đầu tiên để tô sáng
          return cells.slice(0, NEED);
        }
      }
      return null;
    }

    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    function updateStatus() {
      const role = turn === 0 ? "Order — cần tạo hàng 5" : "Chaos — cần chặn hàng 5";
      ctx.setStatus(`Lượt Người chơi ${turn + 1} (${role}). Chọn X hoặc O rồi đặt.`);
    }

    ctx.setNames("Order (P1)", "Chaos (P2)");
    ctx.setTurn(0);
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "orderchaos",
    name: "Order & Chaos",
    emoji: "🔀",
    description: "Biến thể caro độc đáo: cả hai cùng đặt X/O, nhưng hai người có mục tiêu trái ngược nhau.",
    onlineReady: true,
    howTo: [
      "Bàn 6×6. Cả hai người đều được đặt ký hiệu X HOẶC O vào ô trống (chọn bằng nút phía trên bàn).",
      "Người chơi 1 là 'Order': thắng nếu tạo được 5 ký hiệu GIỐNG NHAU liên tiếp (ngang, dọc, hoặc chéo).",
      "Người chơi 2 là 'Chaos': thắng nếu lấp đầy cả bàn mà KHÔNG xuất hiện hàng 5 nào.",
      "Lưu ý: bất kỳ hàng 5 nào (dù do ai đặt) cũng tính là Order thắng — nên Chaos phải tìm cách phá thế.",
      "Hai người luân phiên, mỗi lượt đặt đúng một ký hiệu.",
    ],
    create,
  });
})();
