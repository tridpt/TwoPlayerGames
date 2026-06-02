/* Dots and Boxes - Nối Ô — chơi chung máy & online
   Lưới 5x5 chấm = 4x4 ô. Nối cạnh, ai hoàn thành ô thì chiếm ô đó
   và được đi tiếp. Hết cạnh, ai nhiều ô hơn sẽ thắng. */
(function () {
  const DOTS = 5;             // số chấm mỗi chiều
  const B = DOTS - 1;         // số ô mỗi chiều (4)

  function create(ctx) {
    // hEdges[r][c]: cạnh ngang, r in [0..DOTS-1], c in [0..B-1]
    // vEdges[r][c]: cạnh dọc,  r in [0..B-1],   c in [0..DOTS-1]
    const hEdges = Array.from({ length: DOTS }, () => Array(B).fill(false));
    const vEdges = Array.from({ length: B }, () => Array(DOTS).fill(false));
    const owner = Array.from({ length: B }, () => Array(B).fill(null));
    let turn = 0;
    let filled = 0;
    let over = false;

    const grid = document.createElement("div");
    grid.className = "dnb-board";
    const size = 2 * DOTS - 1;
    grid.style.gridTemplateColumns = `repeat(${size}, auto)`;
    ctx.boardEl.appendChild(grid);

    const hEls = Array.from({ length: DOTS }, () => Array(B));
    const vEls = Array.from({ length: B }, () => Array(DOTS));
    const boxEls = Array.from({ length: B }, () => Array(B));

    for (let gr = 0; gr < size; gr++) {
      for (let gc = 0; gc < size; gc++) {
        const cell = document.createElement("div");
        const evenR = gr % 2 === 0, evenC = gc % 2 === 0;
        if (evenR && evenC) {
          cell.className = "dnb-dot";
        } else if (evenR && !evenC) {
          cell.className = "dnb-h";
          const r = gr / 2, c = (gc - 1) / 2;
          hEls[r][c] = cell;
          cell.addEventListener("click", () => onClick({ type: "h", r, c }));
        } else if (!evenR && evenC) {
          cell.className = "dnb-v";
          const r = (gr - 1) / 2, c = gc / 2;
          vEls[r][c] = cell;
          cell.addEventListener("click", () => onClick({ type: "v", r, c }));
        } else {
          cell.className = "dnb-box";
          const r = (gr - 1) / 2, c = (gc - 1) / 2;
          boxEls[r][c] = cell;
        }
        grid.appendChild(cell);
      }
    }

    function edgeTaken(m) {
      return m.type === "h" ? hEdges[m.r][m.c] : vEdges[m.r][m.c];
    }

    function onClick(m) {
      if (over || edgeTaken(m)) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      applyMove(m, false);
    }

    function applyMove(m, fromRemote) {
      if (over || edgeTaken(m)) return;

      if (m.type === "h") { hEdges[m.r][m.c] = true; hEls[m.r][m.c].classList.add("on", turn === 0 ? "p1" : "p2"); }
      else { vEdges[m.r][m.c] = true; vEls[m.r][m.c].classList.add("on", turn === 0 ? "p1" : "p2"); }

      if (!fromRemote && ctx.isOnline) ctx.sendMove(m);

      const gained = claimBoxes(m, turn);
      if (gained > 0) {
        ctx.incScore(turn);
        if (filled === B * B) return finish();
        ctx.setStatus(`✅ Người chơi ${turn + 1} chiếm ${gained} ô — được đi tiếp!`);
        // giữ lượt
        ctx.setTurn(turn);
      } else {
        turn = 1 - turn;
        ctx.setTurn(turn);
        updateStatus();
      }
    }

    // kiểm tra các ô kề cạnh vừa vẽ có đủ 4 cạnh chưa
    function claimBoxes(m, p) {
      const candidates = [];
      if (m.type === "h") {
        if (m.r > 0) candidates.push([m.r - 1, m.c]);
        if (m.r < B) candidates.push([m.r, m.c]);
      } else {
        if (m.c > 0) candidates.push([m.r, m.c - 1]);
        if (m.c < B) candidates.push([m.r, m.c]);
      }
      let count = 0;
      for (const [br, bc] of candidates) {
        if (owner[br][bc] === null && boxComplete(br, bc)) {
          owner[br][bc] = p;
          filled++;
          count++;
          const box = boxEls[br][bc];
          box.classList.add(p === 0 ? "own-p1" : "own-p2");
          box.textContent = p === 0 ? "1" : "2";
        }
      }
      return count;
    }

    function boxComplete(br, bc) {
      return hEdges[br][bc] && hEdges[br + 1][bc] && vEdges[br][bc] && vEdges[br][bc + 1];
    }

    function score(p) {
      let n = 0;
      for (let r = 0; r < B; r++) for (let c = 0; c < B; c++) if (owner[r][c] === p) n++;
      return n;
    }

    function updateStatus() {
      ctx.setStatus(`🟥 P1: ${score(0)} ô  —  🟦 P2: ${score(1)} ô`);
    }

    function finish() {
      over = true;
      ctx.setTurn(-1);
      const a = score(0), b = score(1);
      if (a > b) ctx.setStatus(`🎉 Người chơi 1 thắng ${a}–${b}!`);
      else if (b > a) ctx.setStatus(`🎉 Người chơi 2 thắng ${b}–${a}!`);
      else ctx.setStatus(`🤝 Hòa ${a}–${b}!`);
    }

    ctx.setTurn(0);
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "dotsandboxes",
    name: "Nối Ô (Dots & Boxes)",
    emoji: "🔲",
    description: "Nối các cạnh giữa chấm. Hoàn thành một ô vuông thì chiếm ô đó và được đi tiếp.",
    onlineReady: true,
    create,
  });
})();
