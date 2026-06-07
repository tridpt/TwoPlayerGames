/* Pentago — chơi chung máy & online
   Bàn 6x6 chia 4 ô vuông con 3x3. Mỗi lượt: đặt 1 bi vào ô trống,
   RỒI xoay một ô vuông con 90°. Ai có 5 bi thẳng hàng trước sẽ thắng.
   Nước đi: { cell, quad, dir } với dir = "cw" | "ccw". */
(function () {
  const N = 6;

  function create(ctx) {
    let board = Array.from({ length: N }, () => Array(N).fill(null));
    let turn = 0;
    let over = false;
    let pendingCell = null; // [r,c] vừa đặt, đang chờ chọn xoay

    const root = document.createElement("div");
    root.className = "ptg-root";
    ctx.boardEl.appendChild(root);

    const grid = document.createElement("div");
    grid.className = "ptg-board";
    root.appendChild(grid);

    const cellEls = Array.from({ length: N }, () => Array(N));
    // 4 ô vuông con, mỗi cái chứa 9 ô
    const quadEls = [];
    for (let q = 0; q < 4; q++) {
      const quad = document.createElement("div");
      quad.className = "ptg-quad";
      const qr = Math.floor(q / 2) * 3, qc = (q % 2) * 3;
      for (let i = 0; i < 9; i++) {
        const r = qr + Math.floor(i / 3), c = qc + (i % 3);
        const cell = document.createElement("div");
        cell.className = "ptg-cell";
        cell.addEventListener("click", () => onPlace(r, c));
        quad.appendChild(cell);
        cellEls[r][c] = cell;
      }
      grid.appendChild(quad);
      quadEls.push(quad);
    }

    // nút xoay cho từng ô vuông con
    const rotBar = document.createElement("div");
    rotBar.className = "ptg-rotbar";
    const rotButtons = [];
    for (let q = 0; q < 4; q++) {
      const group = document.createElement("div");
      group.className = "ptg-rotgroup";
      const label = document.createElement("span");
      label.textContent = `Ô ${q + 1}`;
      const ccw = document.createElement("button");
      ccw.className = "btn small"; ccw.textContent = "↺";
      ccw.addEventListener("click", () => onRotate(q, "ccw"));
      const cw = document.createElement("button");
      cw.className = "btn small"; cw.textContent = "↻";
      cw.addEventListener("click", () => onRotate(q, "cw"));
      group.appendChild(label);
      group.appendChild(ccw);
      group.appendChild(cw);
      rotBar.appendChild(group);
      rotButtons.push({ ccw, cw });
    }
    root.appendChild(rotBar);

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onPlace(r, c) {
      if (!canPlay() || pendingCell || board[r][c] !== null) return;
      board[r][c] = turn;
      pendingCell = [r, c];
      render();
      ctx.sound("place");
      setRotEnabled(true);
      ctx.setStatus("Đã đặt bi. Giờ chọn một ô vuông con để XOAY (↺ hoặc ↻).");
    }

    function onRotate(q, dir) {
      if (!canPlay() || !pendingCell) return;
      const move = { cell: pendingCell[0] * N + pendingCell[1], quad: q, dir };
      applyMove(move, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      // nếu là nước từ xa, cần đặt bi trước
      if (fromRemote) {
        const r = Math.floor(move.cell / N), c = move.cell % N;
        if (board[r][c] === null) board[r][c] = turn;
      }
      rotateQuad(move.quad, move.dir);
      pendingCell = null;
      ctx.sound("rotate");

      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);

      render();

      const winners = checkWinners();
      if (winners.length) {
        over = true;
        ctx.setTurn(-1);
        setRotEnabled(false);
        // cả hai cùng đạt 5 (hiếm) -> hòa; ngược lại người trong winners thắng
        if (winners.includes(0) && winners.includes(1)) {
          ctx.setStatus("🤝 Cả hai cùng có 5 bi thẳng hàng — hòa!");
        } else {
          const w = winners[0];
          ctx.incScore(w);
          ctx.setStatus(`🎉 Người chơi ${w + 1} có 5 bi thẳng hàng — chiến thắng!`);
        }
        highlightWin();
        return;
      }
      if (board.every((row) => row.every((v) => v !== null))) {
        over = true;
        ctx.setTurn(-1);
        setRotEnabled(false);
        ctx.setStatus("🤝 Bàn đầy — hòa!");
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      setRotEnabled(false);
      ctx.setStatus(`Lượt Người chơi ${turn + 1} — đặt một bi vào ô trống.`);
    }

    // xoay ô vuông con q theo chiều dir
    function rotateQuad(q, dir) {
      const qr = Math.floor(q / 2) * 3, qc = (q % 2) * 3;
      const old = [];
      for (let r = 0; r < 3; r++) old.push([board[qr + r][qc], board[qr + r][qc + 1], board[qr + r][qc + 2]]);
      const nu = [[null, null, null], [null, null, null], [null, null, null]];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (dir === "cw") nu[c][2 - r] = old[r][c];
          else nu[2 - c][r] = old[r][c];
        }
      }
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          board[qr + r][qc + c] = nu[r][c];
    }

    function setRotEnabled(on) {
      rotButtons.forEach(({ ccw, cw }) => { ccw.disabled = !on; cw.disabled = !on; });
      rotBar.classList.toggle("ptg-armed", on);
    }

    // tìm người chơi có >=5 bi thẳng hàng
    function checkWinners() {
      const found = new Set();
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const p = board[r][c];
          if (p === null) continue;
          for (const [dr, dc] of dirs) {
            let cnt = 1, nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === p) {
              cnt++; nr += dr; nc += dc;
              if (cnt >= 5) { found.add(p); break; }
            }
          }
        }
      }
      return [...found];
    }

    function highlightWin() {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const p = board[r][c];
          if (p === null) continue;
          for (const [dr, dc] of dirs) {
            const cells = [[r, c]];
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === p) { cells.push([nr, nc]); nr += dr; nc += dc; }
            if (cells.length >= 5) cells.forEach(([rr, cc]) => cellEls[rr][cc].classList.add("win"));
          }
        }
      }
    }

    function render() {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = cellEls[r][c];
          cell.className = "ptg-cell";
          cell.innerHTML = "";
          const v = board[r][c];
          if (v !== null) {
            const m = document.createElement("div");
            m.className = "ptg-marble " + (v === 0 ? "p1" : "p2");
            cell.appendChild(m);
          }
          if (pendingCell && pendingCell[0] === r && pendingCell[1] === c) cell.classList.add("just");
        }
      }
    }

    ctx.setTurn(0);
    setRotEnabled(false);
    render();
    ctx.setStatus("Đặt một bi vào ô trống, sau đó xoay một ô vuông con. Ai có 5 bi thẳng hàng trước sẽ thắng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "pentago",
    name: "Pentago",
    emoji: "🔵",
    description: "Đặt bi rồi xoay một góc bàn 90°. Tạo 5 bi thẳng hàng để thắng — xoay khéo để vừa công vừa thủ.",
    onlineReady: true,
    howTo: [
      "Bàn 6×6 chia thành 4 ô vuông con (3×3). Người chơi 1 dùng bi đỏ, Người chơi 2 dùng bi xanh.",
      "Mỗi lượt gồm 2 bước: (1) bấm vào một ô trống để đặt bi của bạn.",
      "(2) Sau khi đặt, chọn một ô vuông con bất kỳ để XOAY 90° — nút ↺ (ngược chiều) hoặc ↻ (thuận chiều) ở thanh bên dưới.",
      "Việc xoay sẽ làm dịch chuyển tất cả bi trong ô vuông con đó — vừa giúp bạn ghép hàng, vừa có thể phá thế đối thủ.",
      "Mục tiêu: tạo 5 bi cùng màu thẳng hàng (ngang, dọc, hoặc chéo), tính cả sau khi xoay.",
      "Nếu sau cú xoay mà cả hai cùng có hàng 5 thì hòa.",
    ],
    create,
  });
})();
