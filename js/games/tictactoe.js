/* Cờ Caro 3x3 (Tic-Tac-Toe) — hỗ trợ chơi chung máy & online
   Có chế độ cổ điển và chế độ "3 quân di chuyển" (Three Men's Morris). */
(function () {
  const WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const MOVE_DRAW_LIMIT = 30; // số nước ở giai đoạn di chuyển trước khi hòa

  function rc(i) { return [Math.floor(i / 3), i % 3]; }
  function adjacent(a, b) {
    const [ra, ca] = rc(a), [rb, cb] = rc(b);
    return Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1 && a !== b;
  }

  function create(ctx) {
    const o = ctx.options || {};
    const MOVE_MODE = o.mode === "move";

    let board = Array(9).fill(null);
    let turn = 0;
    let over = false;
    const placed = [0, 0];   // số quân đã đặt mỗi bên (chế độ di chuyển)
    let phase = "place";      // "place" | "move"
    let selected = null;      // ô quân đang chọn (chế độ di chuyển)
    let lastCells = [];       // các ô của nước đi cuối để highlight
    let moveCount = 0;        // đếm nước ở giai đoạn di chuyển
    let ghostIdx = null;
    const history = [];       // ngăn xếp trạng thái để hoàn tác

    const root = document.createElement("div");
    root.className = "ttt-root";
    ctx.boardEl.appendChild(root);

    // HUD
    const hud = document.createElement("div");
    hud.className = "ttt-hud";
    const sx = document.createElement("div");
    sx.className = "ttt-side x";
    sx.innerHTML = '<span class="ttt-mk">X</span>';
    const badge = document.createElement("div");
    badge.className = "ttt-badge";
    const so = document.createElement("div");
    so.className = "ttt-side o";
    so.innerHTML = '<span class="ttt-mk">O</span>';
    hud.appendChild(sx); hud.appendChild(badge); hud.appendChild(so);
    root.appendChild(hud);

    const grid = document.createElement("div");
    grid.className = "ttt-board";
    root.appendChild(grid);

    const cells = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElement("div");
      c.className = "ttt-cell";
      const ii = i;
      c.addEventListener("click", () => onClick(ii));
      c.addEventListener("mouseenter", () => onHover(ii));
      c.addEventListener("mouseleave", () => clearHover());
      grid.appendChild(c);
      cells.push(c);
    }

    function symbol(p) { return p === 0 ? "X" : "O"; }
    function myTurnNow() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onHover(i) {
      clearHover();
      if (!myTurnNow()) return;
      // chỉ hiện quân ma khi có thể đặt vào ô trống này
      const canPlaceHere = board[i] === null &&
        (!MOVE_MODE || phase === "place") &&
        !(MOVE_MODE && phase === "move");
      if (canPlaceHere) {
        cells[i].classList.add("ghost", turn === 0 ? "gx" : "go");
        cells[i].textContent = symbol(turn);
        ghostIdx = i;
      }
    }
    function clearHover() {
      if (ghostIdx !== null && board[ghostIdx] === null) {
        cells[ghostIdx].classList.remove("ghost", "gx", "go");
        cells[ghostIdx].textContent = "";
      }
      ghostIdx = null;
    }

    function onClick(i) {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      clearHover();

      if (!MOVE_MODE || phase === "place") {
        if (board[i] !== null) return;
        applyMove({ k: "p", i }, false);
        return;
      }

      // giai đoạn di chuyển
      if (board[i] === turn) {
        selected = (selected === i) ? null : i;
        render();
        return;
      }
      if (selected !== null && board[i] === null && adjacent(selected, i)) {
        applyMove({ k: "m", from: selected, to: i }, false);
      }
    }

    function snapshot() {
      history.push({
        board: board.slice(),
        turn, over,
        placed: placed.slice(),
        phase, moveCount,
        lastCells: lastCells.slice(),
      });
      if (history.length > 100) history.shift();
    }

    function undo() {
      if (!history.length) return false;
      const s = history.pop();
      board = s.board.slice();
      turn = s.turn;
      over = s.over;
      placed[0] = s.placed[0]; placed[1] = s.placed[1];
      phase = s.phase;
      moveCount = s.moveCount;
      lastCells = s.lastCells.slice();
      selected = null;
      ghostIdx = null;
      // xóa highlight thắng
      cells.forEach((c) => c.classList.remove("win"));
      ctx.setTurn(turn);
      render();
      updateHud();
      return true;
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const p = turn;

      if (move.k === "p") {
        if (board[move.i] !== null) return;
        snapshot();
        board[move.i] = p;
        placed[p]++;
        lastCells = [move.i];
      } else if (move.k === "m") {
        if (board[move.from] !== p || board[move.to] !== null || !adjacent(move.from, move.to)) return;
        snapshot();
        board[move.from] = null;
        board[move.to] = p;
        lastCells = [move.from, move.to];
        moveCount++;
      } else {
        return;
      }
      selected = null;
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);

      // chuyển sang giai đoạn di chuyển khi cả hai đã đặt đủ 3 quân
      if (MOVE_MODE && phase === "place" && placed[0] >= 3 && placed[1] >= 3) {
        phase = "move";
      }

      const line = winningLine(p);
      if (line) {
        over = true;
        line.forEach((idx) => cells[idx].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 ${p === 0 ? "Người chơi 1 (X)" : "Người chơi 2 (O)"} thắng!`);
        ctx.setTurn(-1);
        render();
        updateHud();
        return;
      }

      if (!MOVE_MODE) {
        if (board.every((v) => v !== null)) {
          over = true;
          ctx.setStatus("🤝 Hòa!");
          ctx.setTurn(-1);
          render();
          updateHud();
          return;
        }
      } else if (phase === "move" && moveCount >= MOVE_DRAW_LIMIT) {
        over = true;
        ctx.setStatus(`🤝 Hòa! Đã ${MOVE_DRAW_LIMIT} nước di chuyển mà chưa ai thắng.`);
        ctx.setTurn(-1);
        render();
        updateHud();
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      render();
      updateHud();
    }

    function winningLine(p) {
      return WINS.find((line) => line.every((idx) => board[idx] === p)) || null;
    }

    function updateHud() {
      sx.classList.toggle("turn", !over && turn === 0);
      so.classList.toggle("turn", !over && turn === 1);
      if (over) { badge.textContent = "Kết thúc"; return; }
      badge.innerHTML = `Lượt <b>${symbol(turn)}</b>`;
      if (MOVE_MODE) {
        if (phase === "place") {
          ctx.setStatus(`Đặt quân (${symbol(turn)}): còn ${3 - placed[turn]} quân để đặt. Mỗi bên 3 quân.`);
        } else {
          ctx.setStatus(selected !== null
            ? `Chọn ô trống KỀ để di chuyển quán ${symbol(turn)} (ô sáng).`
            : `Lượt ${symbol(turn)} — bấm 1 quân của bạn rồi đẩy sang ô kề trống.`);
        }
      } else {
        ctx.setStatus(`Lượt ${symbol(turn)} — xếp 3 ô thẳng hàng để thắng.`);
      }
    }

    function render() {
      // hint ô di chuyển hợp lệ
      const hints = new Set();
      if (MOVE_MODE && phase === "move" && selected !== null && !over) {
        for (let i = 0; i < 9; i++) if (board[i] === null && adjacent(selected, i)) hints.add(i);
      }
      for (let i = 0; i < 9; i++) {
        const c = cells[i];
        const wasWin = c.classList.contains("win");
        c.className = "ttt-cell" + (wasWin ? " win" : "");
        const v = board[i];
        if (v !== null) {
          c.textContent = symbol(v);
          c.classList.add(v === 0 ? "x" : "o");
          if (lastCells.includes(i)) c.classList.add("last");
          if (selected === i) c.classList.add("selected");
        } else {
          c.textContent = "";
          if (hints.has(i)) c.classList.add("movehint");
          if (lastCells.includes(i)) c.classList.add("lastempty");
        }
      }
    }

    ctx.setTurn(0);
    render();
    updateHud();
    return { applyMove, undo };
  }

  window.GameRegistry.register({
    id: "tictactoe",
    name: "Cờ Caro 3x3",
    emoji: "❌",
    description: "Xếp 3 ký hiệu thẳng hàng (ngang, dọc, chéo) để chiến thắng. Có thêm chế độ '3 quân di chuyển' chống hòa.",
    onlineReady: true,
    options: [
      {
        id: "mode", label: "Kiểu chơi", default: "classic",
        choices: [
          { value: "classic", label: "Cổ điển (đặt tới khi đầy)" },
          { value: "move", label: "3 quân di chuyển (không hòa)" },
        ],
      },
    ],
    howTo: [
      "Hai người lần lượt đánh dấu X và O vào các ô trống. X luôn đi trước.",
      "Mục tiêu: xếp được 3 ký hiệu của mình thành một hàng — ngang, dọc hoặc chéo.",
      "Chế độ Cổ điển: ai xếp 3 ô thẳng hàng trước thì thắng; lấp kín 9 ô mà chưa ai thắng thì hòa.",
      "Chế độ '3 quân di chuyển': mỗi bên chỉ có 3 quân. Sau khi đặt hết, đến lượt mình bấm 1 quân của bạn rồi đẩy sang một ô TRỐNG KỀ bên (ngang/dọc/chéo). Ô có thể đi tới sẽ được tô sáng.",
      "Chế độ di chuyển hiếm khi hòa — luôn có nước để xoay chuyển thế cờ, đấu trí hơn nhiều!",
    ],
    create,
  });
})();
