/* Reversi / Othello (bàn 8x8) — hỗ trợ chơi chung máy & online */
(function () {
  const N = 8;
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function create(ctx) {
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    board[3][3] = 1; board[3][4] = 0;
    board[4][3] = 0; board[4][4] = 1;
    let turn = 0; // 0 = đen đi trước
    let over = false;

    const boardEl = document.createElement("div");
    boardEl.className = "rv-board";
    ctx.boardEl.appendChild(boardEl);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "rv-cell";
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        boardEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    function inBounds(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    function flipsFor(r, c, p) {
      if (board[r][c] !== null) return [];
      const opp = 1 - p;
      const flips = [];
      for (const [dr, dc] of DIRS) {
        const line = [];
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc) && board[nr][nc] === opp) { line.push([nr, nc]); nr += dr; nc += dc; }
        if (line.length && inBounds(nr, nc) && board[nr][nc] === p) flips.push(...line);
      }
      return flips;
    }

    function legalMoves(p) {
      const moves = [];
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (flipsFor(r, c, p).length) moves.push([r, c]);
      return moves;
    }

    function onClick(r, c) {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      if (!flipsFor(r, c, turn).length) return;
      applyMove({ r, c }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const { r, c } = move;
      const flips = flipsFor(r, c, turn);
      if (!flips.length) return;
      board[r][c] = turn;
      flips.forEach(([fr, fc]) => { board[fr][fc] = turn; });

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c });

      render();
      nextTurn();
    }

    function nextTurn() {
      const other = 1 - turn;
      if (legalMoves(other).length) {
        turn = other;
      } else if (legalMoves(turn).length) {
        ctx.setStatus(`Người chơi ${other + 1} không có nước đi — mất lượt.`);
      } else {
        return endGame();
      }
      ctx.setTurn(turn);
      updateStatus();
      render();
    }

    function count(p) {
      let n = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === p) n++;
      return n;
    }

    function updateStatus() {
      ctx.setStatus(`⚫ Đen: ${count(0)}  —  ⚪ Trắng: ${count(1)}`);
    }

    function endGame() {
      over = true;
      const b = count(0), w = count(1);
      ctx.setTurn(-1);
      if (b > w) { ctx.incScore(0); ctx.setStatus(`🎉 Người chơi 1 (Đen) thắng ${b}–${w}!`); }
      else if (w > b) { ctx.incScore(1); ctx.setStatus(`🎉 Người chơi 2 (Trắng) thắng ${w}–${b}!`); }
      else ctx.setStatus(`🤝 Hòa ${b}–${w}!`);
      render();
    }

    function render() {
      const legal = (over || (ctx.isOnline && turn !== ctx.mySeat)) ? [] : legalMoves(turn);
      const legalSet = new Set(legal.map(([r, c]) => r * N + c));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = cellEls[r][c];
          cell.innerHTML = "";
          cell.classList.remove("legal");
          const v = board[r][c];
          if (v !== null) {
            const disc = document.createElement("div");
            disc.className = "rv-disc " + (v === 0 ? "p1" : "p2");
            cell.appendChild(disc);
          } else if (legalSet.has(r * N + c)) {
            cell.classList.add("legal");
          }
        }
      }
    }

    ctx.setNames("Người chơi 1 (Đen)", "Người chơi 2 (Trắng)");
    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "reversi",
    name: "Cờ Lật (Reversi)",
    emoji: "⚫",
    description: "Kẹp quân đối thủ để lật thành quân mình. Ai nhiều quân hơn khi hết bàn sẽ thắng.",
    onlineReady: true,
    howTo: [
      "Người chơi 1 dùng quân Đen, Người chơi 2 dùng quân Trắng. Đen đi trước.",
      "Các ô có thể đánh được sẽ hiện chấm mờ gợi ý.",
      "Đặt quân sao cho kẹp được một hàng quân đối thủ giữa quân vừa đặt và một quân khác của mình — toàn bộ hàng bị kẹp sẽ lật thành quân của bạn.",
      "Bạn chỉ được đánh vào ô tạo ra ít nhất một lần lật. Nếu không có nước đi hợp lệ thì mất lượt.",
      "Khi bàn đầy (hoặc cả hai đều không đi được), ai có nhiều quân hơn sẽ thắng.",
    ],
    create,
  });
})();
