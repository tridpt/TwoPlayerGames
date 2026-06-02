/* Cờ Caro 3x3 (Tic-Tac-Toe) — hỗ trợ chơi chung máy & online */
(function () {
  const WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function create(ctx) {
    let board = Array(9).fill(null);
    let turn = 0;
    let over = false;

    const grid = document.createElement("div");
    grid.className = "ttt-board";
    ctx.boardEl.appendChild(grid);

    const cells = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElement("div");
      c.className = "ttt-cell";
      c.addEventListener("click", () => onClick(i));
      grid.appendChild(c);
      cells.push(c);
    }

    function symbol(p) { return p === 0 ? "X" : "O"; }

    // Người dùng bấm ô
    function onClick(i) {
      if (over || board[i] !== null) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return; // chưa tới lượt mình
      applyMove(i, false);
    }

    // Áp dụng một nước đi (local hoặc nhận từ đối thủ)
    function applyMove(i, fromRemote) {
      if (over || board[i] !== null) return;
      const p = turn;
      board[i] = p;
      cells[i].textContent = symbol(p);
      cells[i].classList.add(p === 0 ? "x" : "o");
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove(i);

      const line = winningLine(p);
      if (line) {
        over = true;
        line.forEach((idx) => cells[idx].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 ${p === 0 ? "Người chơi 1 (X)" : "Người chơi 2 (O)"} thắng!`);
        ctx.setTurn(-1);
        return;
      }
      if (board.every((v) => v !== null)) {
        over = true;
        ctx.setStatus("🤝 Hòa!");
        ctx.setTurn(-1);
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
    }

    function winningLine(p) {
      return WINS.find((line) => line.every((idx) => board[idx] === p)) || null;
    }

    ctx.setTurn(0);
    ctx.setStatus("X đi trước. Xếp 3 ô thẳng hàng để thắng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "tictactoe",
    name: "Cờ Caro 3x3",
    emoji: "❌",
    description: "Xếp 3 ký hiệu thẳng hàng (ngang, dọc, chéo) để chiến thắng.",
    onlineReady: true,
    howTo: [
      "Hai người lần lượt đánh dấu X và O vào các ô trống. X luôn đi trước.",
      "Mục tiêu: xếp được 3 ký hiệu của mình thành một hàng — ngang, dọc hoặc chéo.",
      "Ai xếp đủ 3 ô thẳng hàng trước sẽ thắng ván đó.",
      "Nếu lấp kín cả 9 ô mà chưa ai thắng thì ván đó hòa.",
    ],
    create,
  });
})();
