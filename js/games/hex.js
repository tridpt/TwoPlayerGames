/* Hex - cờ kết nối trên lưới lục giác (11x11) — chơi chung máy & online
   Người chơi 1 (Đỏ) nối cạnh TRÊN với cạnh DƯỚI.
   Người chơi 2 (Xanh) nối cạnh TRÁI với cạnh PHẢI.
   Không bao giờ có hòa. */
(function () {
  const N = 11;
  // 6 hướng kề trên lưới hex hình thoi
  const NB = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]];

  function create(ctx) {
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    let turn = 0; // 0 = đỏ (trên-dưới), 1 = xanh (trái-phải)
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "hex-wrap";
    const grid = document.createElement("div");
    grid.className = "hex-grid";
    wrap.appendChild(grid);
    ctx.boardEl.appendChild(wrap);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "hex-row";
      rowEl.style.marginLeft = `${r * 1.0}em`; // dịch phải tạo hình thoi
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "hex-cell";
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        rowEl.appendChild(cell);
        cellEls[r][c] = cell;
      }
      grid.appendChild(rowEl);
    }

    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

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
      cellEls[r][c].classList.add(p === 0 ? "p1" : "p2");
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c });

      const path = checkWin(p);
      if (path) {
        over = true;
        path.forEach((k) => cellEls[Math.floor(k / N)][k % N].classList.add("win"));
        ctx.incScore(p);
        ctx.setStatus(`🎉 Người chơi ${p + 1} (${p === 0 ? "Đỏ" : "Xanh"}) đã nối thông — chiến thắng!`);
        ctx.setTurn(-1);
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
    }

    // BFS: đỏ nối hàng 0 -> hàng N-1; xanh nối cột 0 -> cột N-1
    function checkWin(p) {
      const visited = new Set();
      const queue = [];
      const parent = new Map();
      const isStart = (r, c) => (p === 0 ? r === 0 : c === 0);
      const isEnd = (r, c) => (p === 0 ? r === N - 1 : c === N - 1);

      for (let i = 0; i < N; i++) {
        const r = p === 0 ? 0 : i;
        const c = p === 0 ? i : 0;
        if (board[r][c] === p) { queue.push([r, c]); visited.add(r * N + c); parent.set(r * N + c, null); }
      }

      while (queue.length) {
        const [r, c] = queue.shift();
        if (isEnd(r, c)) return reconstruct(parent, r * N + c);
        for (const [dr, dc] of NB) {
          const nr = r + dr, nc = c + dc;
          if (inB(nr, nc) && board[nr][nc] === p && !visited.has(nr * N + nc)) {
            visited.add(nr * N + nc);
            parent.set(nr * N + nc, r * N + c);
            queue.push([nr, nc]);
          }
        }
      }
      return null;
    }

    function reconstruct(parent, end) {
      const path = [];
      let cur = end;
      while (cur !== null && cur !== undefined) { path.push(cur); cur = parent.get(cur); }
      return path;
    }

    function updateStatus() {
      const who = turn === 0 ? "Đỏ (nối trên–dưới)" : "Xanh (nối trái–phải)";
      ctx.setStatus(`Lượt Người chơi ${turn + 1} — ${who}.`);
    }

    ctx.setNames("Người chơi 1 (Đỏ)", "Người chơi 2 (Xanh)");
    ctx.setTurn(0);
    ctx.setStatus("Đỏ nối cạnh TRÊN với DƯỚI. Xanh nối cạnh TRÁI với PHẢI. Đỏ đi trước.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "hex",
    name: "Hex",
    emoji: "⬡",
    description: "Cờ kết nối trên lưới lục giác. Tạo một đường quân nối hai cạnh đối diện của mình.",
    onlineReady: true,
    howTo: [
      "Bàn cờ hình thoi gồm các ô lục giác 11×11. Người chơi 1 dùng quân Đỏ, Người chơi 2 dùng quân Xanh. Đỏ đi trước.",
      "Đến lượt mình, bấm vào một ô trống bất kỳ để đặt quân của bạn.",
      "Mục tiêu của Đỏ: tạo một chuỗi quân Đỏ nối liền cạnh TRÊN xuống cạnh DƯỚI.",
      "Mục tiêu của Xanh: tạo một chuỗi quân Xanh nối liền cạnh TRÁI sang cạnh PHẢI.",
      "Các ô được tính là nối nhau nếu chúng kề cạnh trên lưới lục giác.",
      "Hex không bao giờ hòa — luôn có đúng một người tạo được đường nối hoàn chỉnh.",
    ],
    create,
  });
})();
