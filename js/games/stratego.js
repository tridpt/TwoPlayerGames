/* Cờ Quân Úp (Stratego mini) — chơi chung máy & ONLINE
   Bàn 8×8. Mỗi người có 8 quân úp mặt, chỉ lộ khi giao chiến.
   Quân có cấp; cấp cao ăn cấp thấp. Luật đặc biệt:
     - Cờ (🏳️ rank 0): bắt được Cờ đối thủ là THẮNG.
     - Bom (💣 rank 11): đứng yên; ai đâm vào bom thì chết, trừ Công Binh.
     - Công Binh (rank 3): gỡ được bom (ăn bom).
     - Điệp Viên (🕵️ rank 1): nếu CHỦ ĐỘNG tấn công Tướng (rank 10) thì thắng giao tranh đó.
   Nước đi gửi qua mạng: { from, to }. Quân bố trí tất định theo seed chung. */
(function () {
  const N = 6; // bàn 6x6 cho gọn
  // đội hình: rank + số lượng (tổng 6 quân mỗi người, hàng 2 dòng)
  // ranks: 0=Cờ, 1=Điệp viên, 3=Công binh, 5, 8, 10=Tướng, 11=Bom
  const FORMATION = [10, 8, 5, 3, 1, 0, 11, 5, 3, 8, 1, 3]; // 12 quân (2 hàng x 6)
  const NAMES = {
    0: "🏳️ Cờ", 1: "🕵️ Điệp viên", 3: "🛠️ Công binh", 5: "⚔️ Lính",
    8: "🎖️ Sĩ quan", 10: "👑 Tướng", 11: "💣 Bom",
  };
  const ICON = { 0: "🏳️", 1: "🕵️", 3: "🛠️", 5: "⚔️", 8: "🎖️", 10: "👑", 11: "💣" };

  function create(ctx) {
    // board[i] = null | { owner, rank, revealed }
    const total = N * N;
    const board = new Array(total).fill(null);

    // ----- bố trí quân tất định theo seed -----
    function shuffled(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(ctx.rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    // P0 chiếm 2 hàng dưới (rows N-2, N-1), P1 chiếm 2 hàng trên (rows 0,1)
    const f0 = shuffled(FORMATION), f1 = shuffled(FORMATION);
    let k = 0;
    for (let r = N - 2; r < N; r++) for (let c = 0; c < N; c++) {
      board[r * N + c] = { owner: 0, rank: f0[k++], revealed: false };
    }
    k = 0;
    for (let r = 0; r < 2; r++) for (let c = 0; c < N; c++) {
      board[r * N + c] = { owner: 1, rank: f1[k++], revealed: false };
    }

    let turn = 0;
    let selected = null;
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "st-wrap";
    const grid = document.createElement("div");
    grid.className = "st-grid";
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    wrap.appendChild(grid);
    ctx.boardEl.appendChild(wrap);

    const cellEls = [];
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("div");
      cell.className = "st-cell";
      const idx = i;
      cell.addEventListener("click", () => onClick(idx));
      grid.appendChild(cell);
      cellEls.push(cell);
    }

    function rc(i) { return [Math.floor(i / N), i % N]; }
    function adj(a, b) {
      const [r1, c1] = rc(a), [r2, c2] = rc(b);
      return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    }

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    // quân của mình có thể đi (không phải Cờ, không phải Bom)
    function movable(p) { return p && p.rank !== 0 && p.rank !== 11; }

    function legalTargets(i) {
      const p = board[i];
      if (!movable(p)) return [];
      const res = [];
      for (let j = 0; j < total; j++) {
        if (!adj(i, j)) continue;
        const t = board[j];
        if (!t || t.owner !== p.owner) res.push(j); // ô trống hoặc quân địch
      }
      return res;
    }

    function onClick(i) {
      if (!canPlay()) return;
      const p = board[i];
      if (selected === null) {
        if (p && p.owner === turn && movable(p) && legalTargets(i).length) { selected = i; render(); }
        return;
      }
      if (i === selected) { selected = null; render(); return; }
      // chọn quân khác của mình
      if (p && p.owner === turn && movable(p)) {
        selected = legalTargets(i).length ? i : null; render(); return;
      }
      // di chuyển/tấn công nếu hợp lệ
      if (legalTargets(selected).includes(i)) {
        applyMove({ from: selected, to: i }, false);
      }
    }

    // giải quyết giao tranh: trả về 'win'(attacker thắng) | 'lose' | 'both'
    function combat(att, def) {
      if (def.rank === 0) return "flag";          // bắt cờ
      if (def.rank === 11) return att.rank === 3 ? "win" : "lose"; // bom: chỉ công binh gỡ được
      if (att.rank === 1 && def.rank === 10) return "win"; // điệp viên đâm tướng
      if (att.rank === def.rank) return "both";   // cùng cấp: cả hai chết
      return att.rank > def.rank ? "win" : "lose";
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const { from, to } = move;
      const att = board[from];
      if (!att) return;

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ from, to });

      const def = board[to];
      if (!def) {
        // di chuyển vào ô trống
        board[to] = att; board[from] = null;
        ctx.sound("select");
      } else {
        // giao tranh: lộ cả hai
        att.revealed = true; def.revealed = true;
        const result = combat(att, def);
        ctx.sound("capture");
        if (result === "flag") {
          board[to] = att; board[from] = null;
          render();
          return endGame(att.owner, "🏳️ Cờ đã bị bắt!");
        }
        if (result === "win") { board[to] = att; board[from] = null; }
        else if (result === "lose") { board[from] = null; }
        else { board[from] = null; board[to] = null; } // both
      }

      selected = null;
      render();

      // kiểm tra: bên nào hết quân di chuyển được -> thua
      const loser = noMoves();
      if (loser !== -1) return endGame(1 - loser, "Đối thủ không còn nước đi!");

      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
    }

    function noMoves() {
      for (let pl = 0; pl < 2; pl++) {
        let has = false;
        for (let i = 0; i < total; i++) {
          const p = board[i];
          if (p && p.owner === pl && movable(p) && legalTargets(i).length) { has = true; break; }
        }
        if (!has) return pl;
      }
      return -1;
    }

    function endGame(winner, msg) {
      over = true;
      ctx.setTurn(-1);
      // lộ hết quân khi kết thúc
      board.forEach((p) => { if (p) p.revealed = true; });
      render();
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng! ${msg}`);
    }

    function render() {
      const targets = selected !== null ? new Set(legalTargets(selected)) : new Set();
      for (let i = 0; i < total; i++) {
        const cell = cellEls[i];
        const p = board[i];
        cell.className = "st-cell";
        cell.textContent = "";
        if (p) {
          const seeIt = p.revealed || p.owner === (ctx.isOnline ? ctx.mySeat : turn) || over;
          cell.classList.add(p.owner === 0 ? "st-p1" : "st-p2");
          if (seeIt) {
            cell.textContent = ICON[p.rank];
            if (![0, 11].includes(p.rank)) {
              const lv = document.createElement("span");
              lv.className = "st-rank";
              lv.textContent = p.rank;
              cell.appendChild(lv);
            }
          } else {
            cell.classList.add("st-hidden");
            cell.textContent = "▩";
          }
        }
        if (selected === i) cell.classList.add("st-sel");
        if (targets.has(i)) cell.classList.add("st-target");
      }
    }

    function updateStatus() {
      ctx.setStatus(`Lượt Người chơi ${turn + 1}. Chọn quân rồi đi sang ô kề (đâm quân địch để giao tranh).`);
    }

    if (ctx.isOnline) {
      ctx.setNames(`Người chơi 1${ctx.mySeat === 0 ? " (bạn)" : ""}`,
                   `Người chơi 2${ctx.mySeat === 1 ? " (bạn)" : ""}`);
    }
    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "stratego",
    name: "Cờ Quân Úp (Stratego)",
    emoji: "🎖️",
    description: "Quân úp mặt, chỉ lộ khi giao chiến. Cấp cao ăn cấp thấp. Bắt được Cờ đối thủ là thắng.",
    onlineReady: true,
    howTo: [
      "Bàn 6×6. Mỗi người có 12 quân xếp úp ở 2 hàng phía mình — bạn thấy quân mình, đối thủ chỉ thấy ô úp ▩.",
      "Đến lượt, chọn một quân của mình rồi đi sang ô KỀ (ngang/dọc). Đi vào ô có quân địch = giao tranh.",
      "Giao tranh: cả hai lộ mặt, quân CẤP CAO HƠN thắng (cấp ghi trên quân). Bằng cấp thì cả hai cùng chết.",
      "Quân đặc biệt: 🏳️ Cờ và 💣 Bom KHÔNG di chuyển được. 🛠️ Công binh (cấp 3) gỡ được bom. 🕵️ Điệp viên (cấp 1) nếu chủ động đâm 👑 Tướng (cấp 10) thì thắng.",
      "BẮT ĐƯỢC CỜ 🏳️ của đối thủ là thắng ngay. Hoặc khiến đối thủ không còn quân nào di chuyển được.",
      "Mẹo: giấu Cờ sau Bom, dùng quân nhỏ thăm dò để lộ quân lớn của địch.",
    ],
    create,
  });
})();
