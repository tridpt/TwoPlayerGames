/* Cờ Đam (Checkers / English Draughts) 8x8 — chơi chung máy & online
   P1 (Đỏ) ở dưới, đi lên. P2 (Đen) ở trên, đi xuống.
   Quân thường đi/ăn chéo về phía trước; tới hàng cuối thành Vua (đi mọi hướng).
   Bắt buộc ăn khi có thể, và ăn liên hoàn nếu còn ăn được. */
(function () {
  const N = 8;

  function create(ctx) {
    // board[r][c] = null | { p: 0|1, king: bool }
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) board[r][c] = { p: 1, king: false };
          else if (r > 4) board[r][c] = { p: 0, king: false };
        }
      }
    }
    let turn = 0;
    let selected = null;          // [r,c] quân đang chọn
    let mustContinue = null;      // [r,c] quân buộc phải ăn tiếp
    let over = false;

    const grid = document.createElement("div");
    grid.className = "chk-board";
    ctx.boardEl.appendChild(grid);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "chk-cell " + ((r + c) % 2 === 1 ? "dark" : "light");
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        grid.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    function dirsFor(piece) {
      if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      return piece.p === 0 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    }

    // các nước của một quân: {to:[r,c], cap:[r,c]|null}
    function pieceMoves(r, c, capturesOnly) {
      const piece = board[r][c];
      if (!piece) return [];
      const moves = [];
      for (const [dr, dc] of dirsFor(piece)) {
        const ar = r + dr, ac = c + dc;     // ô kề
        const lr = r + 2 * dr, lc = c + 2 * dc; // ô đáp
        if (inB(lr, lc) && board[ar][ac] && board[ar][ac].p !== piece.p && board[lr][lc] === null) {
          moves.push({ to: [lr, lc], cap: [ar, ac] });
        } else if (!capturesOnly && inB(ar, ac) && board[ar][ac] === null) {
          moves.push({ to: [ar, ac], cap: null });
        }
      }
      return moves;
    }

    function playerHasCapture(p) {
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (board[r][c] && board[r][c].p === p && pieceMoves(r, c, true).length)
            return true;
      return false;
    }

    function legalMoves(r, c) {
      if (mustContinue) {
        if (mustContinue[0] !== r || mustContinue[1] !== c) return [];
        return pieceMoves(r, c, true);
      }
      const forced = playerHasCapture(turn);
      return pieceMoves(r, c, forced);
    }

    function playerHasAnyMove(p) {
      const forced = playerHasCapture(p);
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (board[r][c] && board[r][c].p === p && pieceMoves(r, c, forced).length)
            return true;
      return false;
    }

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onClick(r, c) {
      if (!canPlay()) return;
      const piece = board[r][c];

      // đang chọn quân và bấm vào ô đích hợp lệ
      if (selected) {
        const mv = legalMoves(selected[0], selected[1])
          .find((m) => m.to[0] === r && m.to[1] === c);
        if (mv) {
          applyMove({ from: selected.slice(), to: [r, c] }, false);
          return;
        }
      }

      // chọn quân của mình (không cho đổi quân khi đang ăn liên hoàn)
      if (!mustContinue && piece && piece.p === turn && legalMoves(r, c).length) {
        selected = [r, c];
        render();
      }
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const [fr, fc] = move.from;
      const [tr, tc] = move.to;
      const piece = board[fr][fc];
      if (!piece) return;

      const isCapture = Math.abs(tr - fr) === 2;
      board[tr][tc] = piece;
      board[fr][fc] = null;
      if (isCapture) {
        const cr = (fr + tr) / 2, cc = (fc + tc) / 2;
        board[cr][cc] = null;
      }

      // phong Vua
      let promoted = false;
      if (!piece.king && ((piece.p === 0 && tr === 0) || (piece.p === 1 && tr === N - 1))) {
        piece.king = true;
        promoted = true;
      }

      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
      ctx.sound(isCapture ? "capture" : "place");

      // ăn liên hoàn: cùng quân còn ăn tiếp (không áp dụng nếu vừa phong vua theo luật phổ biến)
      if (isCapture && !promoted && pieceMoves(tr, tc, true).length) {
        mustContinue = [tr, tc];
        selected = [tr, tc];
        render();
        ctx.setStatus(`Người chơi ${turn + 1} ăn tiếp! Tiếp tục bắt quân.`);
        return;
      }

      mustContinue = null;
      selected = null;
      turn = 1 - turn;
      render();

      if (!playerHasAnyMove(turn)) {
        over = true;
        ctx.incScore(1 - turn);
        ctx.setStatus(`🎉 Người chơi ${(1 - turn) + 1} thắng — đối thủ không còn nước đi!`);
        ctx.setTurn(-1);
        return;
      }
      ctx.setTurn(turn);
      updateStatus();
    }

    function render() {
      const legalSet = new Set();
      if (selected) {
        legalMoves(selected[0], selected[1]).forEach((m) => legalSet.add(m.to[0] * N + m.to[1]));
      }
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = cellEls[r][c];
          cell.innerHTML = "";
          cell.classList.remove("sel", "hint");
          const piece = board[r][c];
          if (piece) {
            const disc = document.createElement("div");
            disc.className = "chk-piece " + (piece.p === 0 ? "p1" : "p2") + (piece.king ? " king" : "");
            if (piece.king) disc.textContent = "♔";
            cell.appendChild(disc);
          }
          if (selected && selected[0] === r && selected[1] === c) cell.classList.add("sel");
          if (legalSet.has(r * N + c)) cell.classList.add("hint");
        }
      }
    }

    function countPieces(p) {
      let n = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] && board[r][c].p === p) n++;
      return n;
    }

    function updateStatus() {
      ctx.setStatus(`🔴 Đỏ: ${countPieces(0)} quân  —  ⚫ Đen: ${countPieces(1)} quân. ` +
        (playerHasCapture(turn) ? "Bạn buộc phải ăn quân!" : "Chọn quân để đi."));
    }

    ctx.setNames("Người chơi 1 (Đỏ)", "Người chơi 2 (Đen)");
    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "checkers",
    name: "Cờ Đam (Checkers)",
    emoji: "🔴",
    description: "Cờ ăn quân nhảy chéo kinh điển. Bắt hết quân đối thủ hoặc chặn không cho đi sẽ thắng.",
    onlineReady: true,
    howTo: [
      "Người chơi 1 dùng quân Đỏ (ở dưới, đi lên), Người chơi 2 dùng quân Đen (ở trên, đi xuống). Đỏ đi trước.",
      "Bấm vào quân của mình để chọn — các ô đi được sẽ sáng lên. Bấm vào ô sáng để di chuyển.",
      "Quân thường chỉ đi chéo về phía trước 1 ô. Ăn quân bằng cách nhảy chéo qua quân đối thủ vào ô trống ngay sau nó.",
      "Nếu có thể ăn thì BẮT BUỘC phải ăn. Ăn xong mà vẫn còn ăn được tiếp thì phải ăn liên hoàn bằng quân đó.",
      "Quân đi tới hàng cuối cùng phía đối thủ sẽ thành 'Vua' (♔) — đi và ăn được cả 4 hướng chéo.",
      "Thắng khi đối thủ hết quân, hoặc bị chặn không còn nước đi nào.",
    ],
    create,
  });
})();
