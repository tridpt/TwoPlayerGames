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
    const o = ctx.options || {};
    const EMOJI = o.marks === "emoji";
    const PREVIEW = o.preview !== "off";
    const MARK = EMOJI ? ["❌", "⭕"] : ["X", "O"];

    // cells[b][i]: null|0|1 ; b = bàn nhỏ (0..8), i = ô trong bàn (0..8)
    const cells = Array.from({ length: 9 }, () => Array(9).fill(null));
    const boardWinner = Array(9).fill(null); // null | 0 | 1 | "draw"
    let turn = 0;
    let forcedBoard = -1; // -1 = được chọn bàn bất kỳ
    let over = false;
    let lastCell = null; // { b, i }

    const root = document.createElement("div");
    root.className = "utt-root";
    ctx.boardEl.appendChild(root);

    // ----- HUD: đếm bàn thắng + chỉ báo lượt -----
    const hud = document.createElement("div");
    hud.className = "utt-hud";
    const sx = document.createElement("div");
    sx.className = "utt-score x";
    sx.innerHTML = `<span class="utt-mk">${MARK[0]}</span><b id="uttsx">0</b><span class="utt-lbl">bàn</span>`;
    const badge = document.createElement("div");
    badge.className = "utt-badge";
    const so = document.createElement("div");
    so.className = "utt-score o";
    so.innerHTML = `<span class="utt-lbl">bàn</span><b id="uttso">0</b><span class="utt-mk">${MARK[1]}</span>`;
    hud.appendChild(sx); hud.appendChild(badge); hud.appendChild(so);
    root.appendChild(hud);

    const wrap = document.createElement("div");
    wrap.className = "utt-board";
    root.appendChild(wrap);

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
        cell.addEventListener("mouseenter", () => onHover(bb, ii));
        cell.addEventListener("mouseleave", () => clearHover());
        sb.appendChild(cell);
        cellEls[b][i] = cell;
      }
      wrap.appendChild(sb);
    }

    function symbol(p) { return MARK[p]; }

    function playableBoard(b) {
      if (boardWinner[b] !== null) return false;
      if (forcedBoard === -1) return true;
      return b === forcedBoard;
    }

    function myTurnNow() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onHover(b, i) {
      if (!myTurnNow() || cells[b][i] !== null || !playableBoard(b)) return;
      const cell = cellEls[b][i];
      cell.textContent = symbol(turn);
      cell.classList.add("ghost", turn === 0 ? "x" : "o");
      if (PREVIEW) {
        // ô (i) sẽ ép đối thủ tới bàn i (hoặc bàn bất kỳ nếu bàn i đã xong)
        if (boardWinner[i] === null) {
          boardEls[i].classList.add("target");
        } else {
          for (let bb = 0; bb < 9; bb++)
            if (boardWinner[bb] === null) boardEls[bb].classList.add("target-free");
        }
      }
    }

    function clearHover() {
      for (let b = 0; b < 9; b++) {
        boardEls[b].classList.remove("target", "target-free");
        for (let i = 0; i < 9; i++) {
          const cell = cellEls[b][i];
          if (cell.classList.contains("ghost")) {
            cell.classList.remove("ghost", "x", "o");
            cell.textContent = "";
          }
        }
      }
    }

    function onClick(b, i) {
      if (over || cells[b][i] !== null) return;
      if (!playableBoard(b)) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      clearHover();
      applyMove({ b, i }, false);
    }

    function applyMove(move, fromRemote) {
      const { b, i } = move;
      if (over || cells[b][i] !== null || !playableBoard(b)) return;
      const p = turn;
      cells[b][i] = p;

      // xóa highlight nước cũ
      if (lastCell) cellEls[lastCell.b][lastCell.i].classList.remove("last");
      lastCell = { b, i };

      const el = cellEls[b][i];
      el.classList.remove("ghost");
      el.textContent = symbol(p);
      el.classList.add(p === 0 ? "x" : "o", "placed", "last");
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ b, i });

      // kiểm tra bàn nhỏ
      const subLine = winLine(cells[b], p);
      if (subLine) {
        boardWinner[b] = p;
        boardEls[b].classList.add("won", p === 0 ? "won-x" : "won-o");
        boardEls[b].dataset.mark = symbol(p);
        subLine.forEach((idx) => cellEls[b][idx].classList.add("subwin"));
        ctx.sound("capture");
      } else if (cells[b].every((v) => v !== null)) {
        boardWinner[b] = "draw";
        boardEls[b].classList.add("draw");
      }

      updateScore();

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
        const xb = boardWinner.filter((w) => w === 0).length;
        const ob = boardWinner.filter((w) => w === 1).length;
        if (xb > ob) { ctx.incScore(0); ctx.setStatus(`🎉 ${symbol(0)} thắng nhờ nhiều bàn hơn (${xb}–${ob})!`); }
        else if (ob > xb) { ctx.incScore(1); ctx.setStatus(`🎉 ${symbol(1)} thắng nhờ nhiều bàn hơn (${ob}–${xb})!`); }
        else ctx.setStatus("🤝 Hòa toàn cục!");
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

    function updateScore() {
      const xb = boardWinner.filter((w) => w === 0).length;
      const ob = boardWinner.filter((w) => w === 1).length;
      const ex = document.querySelector("#uttsx"), eo = document.querySelector("#uttso");
      if (ex) ex.textContent = xb;
      if (eo) eo.textContent = ob;
    }

    function updateStatus() {
      sx.classList.toggle("turn", !over && turn === 0);
      so.classList.toggle("turn", !over && turn === 1);
      badge.innerHTML = `Lượt <b>${symbol(turn)}</b>`;
      if (forcedBoard === -1)
        ctx.setStatus(`Lượt P${turn + 1} (${symbol(turn)}) — được chọn bàn bất kỳ (bàn sáng).`);
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
    options: [
      {
        id: "marks", label: "Ký hiệu quân", default: "letters",
        choices: [
          { value: "letters", label: "X / O" },
          { value: "emoji", label: "❌ / ⭕ (emoji)" },
        ],
      },
      {
        id: "preview", label: "Xem trước bàn bị ép", default: "on",
        choices: [
          { value: "on", label: "Bật (gợi ý chiến thuật)" },
          { value: "off", label: "Tắt" },
        ],
      },
    ],
    howTo: [
      "Có 9 bàn caro nhỏ (3×3) xếp thành một lưới lớn 3×3. X đi trước.",
      "Vị trí ô bạn đánh trong bàn nhỏ sẽ quyết định bàn nhỏ mà đối thủ buộc phải đánh tiếp. Ví dụ: bạn đánh ô góc trên-trái → đối thủ phải đánh ở bàn nhỏ góc trên-trái.",
      "Khi bật 'Xem trước': rê chuột lên một ô để thấy ngay bàn mà đối thủ sẽ bị ép tới (viền nhấp nháy) — cực kỳ hữu ích để tính nước.",
      "Bàn nhỏ mà bạn được phép đánh sẽ được tô sáng viền vàng.",
      "Thắng một bàn nhỏ (xếp 3 ô thẳng hàng trong bàn đó) thì bàn nhỏ đó tính là của bạn. Bảng trên đếm số bàn mỗi bên đã chiếm.",
      "Nếu bị đẩy tới một bàn đã có người thắng hoặc đã đầy, bạn được chọn đánh ở bàn bất kỳ.",
      "Thắng chung cuộc: chiếm được 3 bàn nhỏ thẳng hàng trên lưới lớn. Nếu lấp đầy hết mà không ai thẳng hàng thì bên nhiều bàn hơn thắng.",
    ],
    create,
  });
})();
