/* Connect Four - Xếp 4 (7 cột x 6 hàng) — hỗ trợ chơi chung máy & online */
(function () {
  const COLS = 7;
  const ROWS = 6;

  function create(ctx) {
    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let turn = 0;
    let over = false;

    const boardEl = document.createElement("div");
    boardEl.className = "c4-board";
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, auto)`;
    ctx.boardEl.appendChild(boardEl);

    const cellEls = Array.from({ length: ROWS }, () => Array(COLS));
    for (let c = 0; c < COLS; c++) {
      const colEl = document.createElement("div");
      colEl.className = "c4-col";
      colEl.style.display = "grid";
      colEl.style.gap = "8px";
      colEl.addEventListener("click", () => onClick(c));
      for (let r = 0; r < ROWS; r++) {
        const cell = document.createElement("div");
        cell.className = "c4-cell";
        colEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
      boardEl.appendChild(colEl);
    }

    function onClick(c) {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      // chỉ đi nếu cột còn chỗ
      if (board[0][c] !== null) return;
      applyMove(c, false);
    }

    function applyMove(c, fromRemote) {
      if (over) return;
      let r = -1;
      for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][c] === null) { r = row; break; }
      }
      if (r === -1) return;

      const p = turn;
      board[r][c] = p;
      cellEls[r][c].classList.add(p === 0 ? "p1" : "p2");
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove(c);

      const line = winningLine(r, c, p);
      if (line) {
        over = true;
        line.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 Người chơi ${p + 1} thắng!`);
        ctx.setTurn(-1);
        return;
      }
      if (board[0].every((v) => v !== null)) {
        over = true;
        ctx.setStatus("🤝 Hòa! Bàn cờ đã đầy.");
        ctx.setTurn(-1);
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
    }

    function winningLine(r, c, p) {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dr, dc] of dirs) {
        const cells = [[r, c]];
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc) && board[nr][nc] === p) { cells.push([nr, nc]); nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (inBounds(nr, nc) && board[nr][nc] === p) { cells.unshift([nr, nc]); nr -= dr; nc -= dc; }
        if (cells.length >= 4) return cells;
      }
      return null;
    }

    function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

    ctx.setTurn(0);
    ctx.setStatus("Thả quân vào cột. Nối 4 quân cùng màu là thắng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "connectfour",
    name: "Xếp 4 (Connect Four)",
    emoji: "🔴",
    description: "Thả quân xuống cột, ai nối được 4 quân thẳng hàng trước sẽ thắng.",
    onlineReady: true,
    howTo: [
      "Bấm vào một cột để thả quân của mình xuống — quân sẽ rơi xuống ô trống thấp nhất của cột đó.",
      "Hai người luân phiên thả quân (Người chơi 1 màu đỏ, Người chơi 2 màu xanh).",
      "Mục tiêu: nối được 4 quân cùng màu thành một hàng — ngang, dọc hoặc chéo.",
      "Ai nối đủ 4 quân trước sẽ thắng. Lấp đầy bàn mà chưa ai thắng thì hòa.",
    ],
    create,
  });
})();
