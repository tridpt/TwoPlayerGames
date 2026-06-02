/* Ultimate Tic-Tac-Toe - Cờ Caro Tối Thượng — chơi chung máy & online
   9 bàn caro nhỏ xếp thành lưới 3x3. Ô bạn đánh quyết định bàn nhỏ
   mà đối thủ buộc phải đánh tiếp. Thắng 3 bàn nhỏ thẳng hàng để thắng chung. */
(function () {
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function create(ctx) {
    // cells[b][i]: null|0|1 ; b = bàn nhỏ (0..8), i = ô trong bàn (0..8)
    const cells = Array.from({ length: 9 }, () => Array(9).fill(null));
    const boardWinner = Array(9).fill(null); // null | 0 | 1 | "draw"
    let turn = 0;
    let forcedBoard = -1; // -1 = được chọn bàn bất kỳ
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "utt-board";
    ctx.boardEl.appendChild(wrap);

    const boardEls = [];
    const cellEls = Array.from({ length: 9 }, () => Array(9));
    for (let b = 0; b < 9; b++) {
      const sb = document.createElement("div");
      sb.className = "utt-sub";
      boardEls.push(sb);
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement("div");
        cell.className = "utt-cell";
        const bb = b, ii = i;
        cell.addEventListener("click", () => onClick(bb, ii));
        sb.appendChild(cell);
        cellEls[b][i] = cell;
      }
      wrap.appendChild(sb);
    }

    function symbol(p) { return p === 0 ? "X" : "O"; }

    function playableBoard(b) {
      if (boardWinner[b] !== null) return false;
      if (forcedBoard === -1) return true;
      return b === forcedBoard;
    }

    function onClick(b, i) {
      if (over || cells[b][i] !== null) return;
      if (!playableBoard(b)) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      applyMove({ b, i }, false);
    }

    function applyMove(move, fromRemote) {
      const { b, i } = move;
      if (over || cells[b][i] !== null || !playableBoard(b)) return;
      const p = turn;
      cells[b][i] = p;
      const el = cellEls[b][i];
      el.textContent = symbol(p);
      el.classList.add(p === 0 ? "x" : "o");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ b, i });

      // kiểm tra bàn nhỏ
      const subLine = winLine(cells[b], p);
      if (subLine) {
        boardWinner[b] = p;
        boardEls[b].classList.add("won", p === 0 ? "won-x" : "won-o");
        boardEls[b].dataset.mark = symbol(p);
      } else if (cells[b].every((v) => v !== null)) {
        boardWinner[b] = "draw";
        boardEls[b].classList.add("draw");
      }

      // kiểm tra thắng chung
      const big = winBig(p);
      if (big) {
        over = true;
        big.forEach((bi) => boardEls[bi].classList.add("big-win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 Người chơi ${p + 1} (${symbol(p)}) thắng toàn cục!`);
        ctx.setTurn(-1);
        highlightForced();
        return;
      }
      if (boardWinner.every((w) => w !== null)) {
        over = true;
        ctx.setStatus("🤝 Hòa toàn cục!");
        ctx.setTurn(-1);
        highlightForced();
        return;
      }

      // ô vừa đánh (i) quyết định bàn kế tiếp
      forcedBoard = (boardWinner[i] === null) ? i : -1;
      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
      highlightForced();
    }

    function winLine(arr, p) {
      return LINES.find((l) => l.every((idx) => arr[idx] === p)) || null;
    }

    function winBig(p) {
      return LINES.find((l) => l.every((bi) => boardWinner[bi] === p)) || null;
    }

    function highlightForced() {
      for (let b = 0; b < 9; b++) {
        boardEls[b].classList.toggle("active", !over && playableBoard(b));
      }
    }

    function updateStatus() {
      if (forcedBoard === -1)
        ctx.setStatus(`Lượt P${turn + 1} (${symbol(turn)}) — được chọn bàn bất kỳ.`);
      else
        ctx.setStatus(`Lượt P${turn + 1} (${symbol(turn)}) — phải đánh ở bàn được tô sáng.`);
    }

    ctx.setTurn(0);
    updateStatus();
    highlightForced();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "ultimate",
    name: "Caro Tối Thượng",
    emoji: "🎯",
    description: "9 bàn caro lồng nhau. Ô bạn đánh ép đối thủ phải đánh ở bàn tương ứng. Cực kỳ đấu trí!",
    onlineReady: true,
    howTo: [
      "Có 9 bàn caro nhỏ (3×3) xếp thành một lưới lớn 3×3. X đi trước.",
      "Vị trí ô bạn đánh trong bàn nhỏ sẽ quyết định bàn nhỏ mà đối thủ buộc phải đánh tiếp. Ví dụ: bạn đánh ô góc trên-trái → đối thủ phải đánh ở bàn nhỏ góc trên-trái.",
      "Bàn nhỏ mà bạn được phép đánh sẽ được tô sáng viền vàng.",
      "Thắng một bàn nhỏ (xếp 3 ô thẳng hàng trong bàn đó) thì bàn nhỏ đó tính là của bạn.",
      "Nếu bị đẩy tới một bàn đã có người thắng hoặc đã đầy, bạn được chọn đánh ở bàn bất kỳ.",
      "Thắng chung cuộc: chiếm được 3 bàn nhỏ thẳng hàng trên lưới lớn.",
    ],
    create,
  });
})();
