/* Gomoku - Cờ Caro 15x15 (nối 5 quân) — chơi chung máy & online */
(function () {
  const N = 15;
  const NEED = 5;

  function create(ctx) {
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    let turn = 0;
    let over = false;

    const boardEl = document.createElement("div");
    boardEl.className = "gmk-board";
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    ctx.boardEl.appendChild(boardEl);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "gmk-cell";
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        boardEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    function onClick(r, c) {
      if (over || board[r][c] !== null) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      applyMove({ r, c }, false);
    }

    function applyMove(move, fromRemote) {
      const { r, c } = move;
      if (over || board[r][c] !== null) return;
      const p = turn;
      board[r][c] = p;
      const stone = document.createElement("div");
      stone.className = "gmk-stone " + (p === 0 ? "p1" : "p2");
      cellEls[r][c].appendChild(stone);
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c });

      const line = winningLine(r, c, p);
      if (line) {
        over = true;
        line.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 Người chơi ${p + 1} (${p === 0 ? "Đen" : "Trắng"}) thắng!`);
        ctx.setTurn(-1);
        return;
      }
      if (board.every((row) => row.every((v) => v !== null))) {
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
        while (inB(nr, nc) && board[nr][nc] === p) { cells.push([nr, nc]); nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (inB(nr, nc) && board[nr][nc] === p) { cells.unshift([nr, nc]); nr -= dr; nc -= dc; }
        if (cells.length >= NEED) return cells;
      }
      return null;
    }

    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    ctx.setNames("Người chơi 1 (Đen)", "Người chơi 2 (Trắng)");
    ctx.setTurn(0);
    ctx.setStatus("Đen đi trước. Nối 5 quân liên tiếp để thắng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "gomoku",
    name: "Cờ Caro 15×15",
    emoji: "⚪",
    description: "Cờ caro cỡ lớn: nối được 5 quân liên tiếp (ngang, dọc, chéo) là thắng.",
    onlineReady: true,
    howTo: [
      "Bàn cờ 15×15. Người chơi 1 dùng quân Đen, Người chơi 2 dùng quân Trắng. Đen đi trước.",
      "Đến lượt mình, bấm vào một ô trống bất kỳ để đặt quân.",
      "Mục tiêu: nối được 5 quân cùng màu liên tiếp thành một hàng — ngang, dọc hoặc chéo.",
      "Ai nối đủ 5 quân trước sẽ thắng ngay lập tức.",
    ],
    create,
  });
})();
