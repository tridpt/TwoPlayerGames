/* Order & Chaos — chơi chung máy & online
   Cả hai người đều được đặt X HOẶC O vào ô trống.
   Order (P1) thắng nếu tạo được chuỗi N ký hiệu giống nhau liên tiếp.
   Chaos (P2) thắng nếu lấp đầy bàn mà không có chuỗi nào đủ dài. */
(function () {
  const SIZES = {
    6: { n: 6, need: 5 },
    8: { n: 8, need: 5 },
    10: { n: 10, need: 6 },
  };
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  function create(ctx) {
    const o = ctx.options || {};
    const conf = SIZES[o.size] || SIZES[8];
    const N = conf.n;
    const NEED = conf.need;

    let board = Array.from({ length: N }, () => Array(N).fill(null));
    let turn = 0; // 0 = Order, 1 = Chaos
    let chosen = "X";
    let over = false;
    let count = 0;
    let lastMove = null;

    const root = document.createElement("div");
    root.className = "oc-root";
    ctx.boardEl.appendChild(root);

    const header = document.createElement("div");
    header.className = "oc-header";
    root.appendChild(header);

    // Bộ chọn ký hiệu
    const picker = document.createElement("div");
    picker.className = "oc-picker";
    picker.innerHTML = `<span class="oc-picker-label">Đặt:</span>`;
    const xBtn = document.createElement("button");
    xBtn.type = "button";
    xBtn.className = "oc-sym-btn x active";
    xBtn.textContent = "X";
    const oBtn = document.createElement("button");
    oBtn.type = "button";
    oBtn.className = "oc-sym-btn o";
    oBtn.textContent = "O";
    xBtn.addEventListener("click", () => setSym("X"));
    oBtn.addEventListener("click", () => setSym("O"));
    picker.appendChild(xBtn);
    picker.appendChild(oBtn);
    const hint = document.createElement("span");
    hint.className = "oc-picker-hint";
    hint.textContent = "(phím X / O)";
    picker.appendChild(hint);
    root.appendChild(picker);

    const grid = document.createElement("div");
    grid.className = "oc-board";
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    if (N >= 10) grid.classList.add("big");
    root.appendChild(grid);

    const cellEls = Array.from({ length: N }, () => Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div");
        cell.className = "oc-cell";
        const rr = r, cc = c;
        cell.addEventListener("click", () => onClick(rr, cc));
        cell.addEventListener("mouseenter", () => onHover(rr, cc, true));
        cell.addEventListener("mouseleave", () => onHover(rr, cc, false));
        grid.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function setSym(s) {
      chosen = s;
      xBtn.classList.toggle("active", s === "X");
      oBtn.classList.toggle("active", s === "O");
    }

    function onHover(r, c, on) {
      if (!canPlay() || board[r][c] !== null) return;
      const el = cellEls[r][c];
      if (on) {
        el.classList.add("ghost", chosen === "X" ? "x" : "o");
        el.textContent = chosen;
      } else {
        el.classList.remove("ghost", "x", "o");
        el.textContent = "";
      }
    }

    function onClick(r, c) {
      if (!canPlay() || board[r][c] !== null) return;
      applyMove({ r, c, sym: chosen }, false);
    }

    function applyMove(move, fromRemote) {
      const r = Number(move.r), c = Number(move.c);
      const sym = move.sym === "O" ? "O" : "X";
      if (over || !inB(r, c) || board[r][c] !== null) return;
      board[r][c] = sym;
      count++;
      if (lastMove) cellEls[lastMove[0]][lastMove[1]].classList.remove("last");
      lastMove = [r, c];
      const el = cellEls[r][c];
      el.classList.remove("ghost");
      el.textContent = sym;
      el.classList.add(sym === "X" ? "x" : "o", "last");
      ctx.sound("place");

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ r, c, sym });

      const line = fiveLine(r, c, sym);
      if (line) {
        over = true;
        line.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
        ctx.incScore(0);
        ctx.setTurn(-1);
        picker.classList.add("disabled");
        renderHeader();
        ctx.setStatus(`🎉 Order (Người chơi 1) thắng — tạo được chuỗi ${NEED}!`);
        return;
      }
      if (count === N * N) {
        over = true;
        ctx.incScore(1);
        ctx.setTurn(-1);
        picker.classList.add("disabled");
        renderHeader();
        ctx.setStatus(`🎉 Chaos (Người chơi 2) thắng — bàn đầy, không có chuỗi ${NEED}!`);
        return;
      }

      turn = 1 - turn;
      setSym("X");
      ctx.setTurn(turn);
      renderHeader();
      updateStatus();
    }

    function fiveLine(r, c, sym) {
      for (const [dr, dc] of DIRS) {
        const cells = [[r, c]];
        let nr = r + dr, nc = c + dc;
        while (inB(nr, nc) && board[nr][nc] === sym) { cells.push([nr, nc]); nr += dr; nc += dc; }
        nr = r - dr; nc = c - dc;
        while (inB(nr, nc) && board[nr][nc] === sym) { cells.unshift([nr, nc]); nr -= dr; nc -= dc; }
        if (cells.length >= NEED) return cells.slice(0, NEED);
      }
      return null;
    }

    // chuỗi dài nhất hiện có trên bàn (của bất kỳ ký hiệu nào)
    function longestRun() {
      let best = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const sym = board[r][c];
          if (!sym) continue;
          for (const [dr, dc] of DIRS) {
            const pr = r - dr, pc = c - dc;
            if (inB(pr, pc) && board[pr][pc] === sym) continue; // chỉ đếm từ đầu chuỗi
            let len = 1, nr = r + dr, nc = c + dc;
            while (inB(nr, nc) && board[nr][nc] === sym) { len++; nr += dr; nc += dc; }
            if (len > best) best = len;
          }
        }
      }
      return best;
    }

    function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

    function renderHeader() {
      const run = Math.min(longestRun(), NEED);
      const runPct = run / NEED * 100;
      const fillPct = count / (N * N) * 100;
      const roleBadge = over
        ? `<span class="oc-role">Kết thúc</span>`
        : `<span class="oc-role ${turn === 0 ? "order" : "chaos"}">${turn === 0 ? "🏆 ORDER" : "🌀 CHAOS"} · Người chơi ${turn + 1}</span>`;
      header.innerHTML = `
        ${roleBadge}
        <div class="oc-meters">
          <div class="oc-meter">
            <span>Chuỗi dài nhất ${run}/${NEED}</span>
            <i class="oc-bar order"><i style="width:${runPct}%"></i></i>
          </div>
          <div class="oc-meter">
            <span>Bàn đầy ${count}/${N * N}</span>
            <i class="oc-bar chaos"><i style="width:${fillPct}%"></i></i>
          </div>
        </div>
      `;
    }

    function updateStatus() {
      if (over) return;
      const role = turn === 0 ? "Order — tạo chuỗi để thắng" : "Chaos — chặn không cho đủ chuỗi";
      if (ctx.isOnline && turn !== ctx.mySeat) {
        ctx.setStatus(`Đối thủ đang đi (${role}).`);
      } else {
        ctx.setStatus(`Lượt Người chơi ${turn + 1} (${role}). Chọn X hoặc O rồi đặt vào ô trống.`);
      }
    }

    function onKey(e) {
      if (e.key === "x" || e.key === "X") setSym("X");
      else if (e.key === "o" || e.key === "O") setSym("O");
    }
    window.addEventListener("keydown", onKey);

    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        window.removeEventListener("keydown", onKey);
        observer.disconnect();
      }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    ctx.setNames("Order (P1)", "Chaos (P2)");
    ctx.setTurn(0);
    renderHeader();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "orderchaos",
    name: "Order & Chaos",
    emoji: "🔀",
    description: "Biến thể caro độc đáo: cả hai cùng đặt X/O nhưng mục tiêu trái ngược. Bàn rộng tới 10×10, có thanh đo chuỗi & độ đầy bàn.",
    onlineReady: true,
    options: [
      {
        id: "size", label: "Bàn cờ", default: 8,
        choices: [
          { value: 6, label: "6×6 · chuỗi 5 (chuẩn)" },
          { value: 8, label: "8×8 · chuỗi 5 (rộng)" },
          { value: 10, label: "10×10 · chuỗi 6 (lớn)" },
        ],
      },
    ],
    howTo: [
      "Cả hai người đều được đặt ký hiệu X HOẶC O vào ô trống (chọn bằng nút trên bàn hoặc phím X / O).",
      "Người chơi 1 là 'Order': thắng nếu tạo được chuỗi ký hiệu GIỐNG NHAU liên tiếp đủ dài (ngang/dọc/chéo) — 5 với bàn 6×6 và 8×8, 6 với bàn 10×10.",
      "Người chơi 2 là 'Chaos': thắng nếu lấp đầy cả bàn mà KHÔNG xuất hiện chuỗi đủ dài nào.",
      "Bất kỳ chuỗi đủ dài nào (dù do ai đặt) cũng tính Order thắng — nên Chaos phải khéo phá thế bằng cách xen ký hiệu khác.",
      "Thanh 'Chuỗi dài nhất' cho biết Order đang gần thắng đến đâu; thanh 'Bàn đầy' cho biết Chaos sắp về đích chưa. Di chuột lên ô trống để xem trước ký hiệu sắp đặt.",
      "Chọn bàn lớn hơn ở phần tùy chọn để ván dài và nhiều thế trận hơn.",
    ],
    create,
  });
})();
