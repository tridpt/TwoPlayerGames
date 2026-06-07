/* Gomoku - Cờ Caro (nối N quân) — chơi chung máy & online */
(function () {
  function create(ctx) {
    const N = (ctx.options && ctx.options.size) || 15;
    const NEED = (ctx.options && ctx.options.need) || 5;
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    let turn = 0;
    let over = false;

    const boardEl = document.createElement("div");
    boardEl.className = "gmk-board";
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    boardEl.style.setProperty("--n", N);
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

    let lastCell = null;

    function applyMove(move, fromRemote) {
      const { r, c } = move;
      if (over || board[r][c] !== null) return;
      const p = turn;
      board[r][c] = p;
      const stone = document.createElement("div");
      stone.className = "gmk-stone " + (p === 0 ? "p1" : "p2");
      stone.textContent = p === 0 ? "X" : "O";
      cellEls[r][c].appendChild(stone);
      // highlight nước đi cuối
      if (lastCell) cellEls[lastCell[0]][lastCell[1]].classList.remove("last");
      cellEls[r][c].classList.add("last");
      lastCell = [r, c];
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c });

      const line = winningLine(r, c, p);
      if (line) {
        over = true;
        line.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 Người chơi ${p + 1} (${p === 0 ? "X" : "O"}) thắng!`);
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

    ctx.setNames("Người chơi 1 (X)", "Người chơi 2 (O)");
    ctx.setTurn(0);
    ctx.setStatus(`X đi trước. Nối ${NEED} quân liên tiếp để thắng.`);
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "gomoku",
    name: "Cờ Caro 15×15",
    emoji: "⚪",
    description: "Cờ caro cỡ lớn dùng ký hiệu X/O: nối được 5 quân liên tiếp (ngang, dọc, chéo) là thắng.",
    onlineReady: true,
    options: [
      {
        id: "size", label: "Kích thước bàn", default: 15,
        choices: [
          { value: 9, label: "9×9 (nhanh)" },
          { value: 13, label: "13×13" },
          { value: 15, label: "15×15 (chuẩn)" },
          { value: 19, label: "19×19 (lớn)" },
        ],
      },
      {
        id: "need", label: "Số quân để thắng", default: 5,
        choices: [
          { value: 4, label: "4 quân (dễ)" },
          { value: 5, label: "5 quân (chuẩn)" },
          { value: 6, label: "6 quân (khó)" },
        ],
      },
    ],
    howTo: [
      "Bàn cờ tùy chỉnh (mặc định 15×15). Người chơi 1 dùng ký hiệu X, Người chơi 2 dùng ký hiệu O. X đi trước.",
      "Đến lượt mình, bấm vào một ô trống bất kỳ để đặt quân.",
      "Mục tiêu: nối được số quân cùng màu liên tiếp (theo tùy chỉnh) thành một hàng — ngang, dọc hoặc chéo.",
      "Ai nối đủ số quân yêu cầu trước sẽ thắng ngay lập tức.",
      "Có thể chỉnh kích thước bàn và số quân cần nối ở màn chọn chế độ để ván dễ hơn hoặc khó hơn.",
    ],
    create,
  });
})();
