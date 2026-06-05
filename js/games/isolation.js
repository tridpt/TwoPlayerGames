/* Isolation Duel - Co Co Lap
   Hai quan bat dau o hai goc. Moi luot di theo hang/cot/cheo bat ky so o,
   o vua roi se bi khoa. Ai lam doi thu khong con nuoc di se thang. */
(function () {
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function create(ctx) {
    const size = Number(ctx.options?.size || 7);
    const N = [5, 7, 9].includes(size) ? size : 7;
    const total = N * N;
    const blocked = Array(total).fill(false);
    const pos = [0, total - 1];
    let turn = 0;
    let over = false;

    const board = document.createElement("div");
    board.className = "iso-board";
    board.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    board.style.setProperty("--iso-size", String(N));
    ctx.boardEl.appendChild(board);

    const cells = [];
    for (let i = 0; i < total; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "iso-cell";
      cell.addEventListener("click", () => onCell(i));
      board.appendChild(cell);
      cells.push(cell);
    }

    function idx(r, c) { return r * N + c; }
    function row(i) { return Math.floor(i / N); }
    function col(i) { return i % N; }
    function occupied(i) { return pos[0] === i || pos[1] === i; }
    function canAct() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function legalMoves(player) {
      const out = [];
      const start = pos[player];
      const sr = row(start);
      const sc = col(start);
      DIRS.forEach(([dr, dc]) => {
        let r = sr + dr;
        let c = sc + dc;
        while (r >= 0 && r < N && c >= 0 && c < N) {
          const target = idx(r, c);
          if (blocked[target] || occupied(target)) break;
          out.push(target);
          r += dr;
          c += dc;
        }
      });
      return out;
    }

    function onCell(i) {
      if (!canAct()) return;
      if (!legalMoves(turn).includes(i)) return;
      applyMove({ to: i }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const to = Number(move?.to);
      const legal = legalMoves(turn);
      if (!Number.isInteger(to) || !legal.includes(to)) return;

      const player = turn;
      const old = pos[player];
      blocked[old] = true;
      pos[player] = to;
      ctx.sound("place");
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ to });

      const next = 1 - turn;
      if (legalMoves(next).length === 0) {
        over = true;
        ctx.incScore(player);
        ctx.setStatus(`🎉 Người chơi ${player + 1} thắng! Đối thủ không còn nước đi.`);
        ctx.setTurn(-1);
        render();
        return;
      }

      turn = next;
      ctx.setTurn(turn);
      updateStatus();
      render();
    }

    function updateStatus() {
      if (over) return;
      const moves = legalMoves(turn).length;
      ctx.setStatus(`Người chơi ${turn + 1}: chọn một ô hợp lệ để di chuyển. Còn ${moves} nước.`);
    }

    function render() {
      const legal = canAct() ? new Set(legalMoves(turn)) : new Set();
      cells.forEach((cell, i) => {
        cell.className = "iso-cell";
        cell.textContent = "";
        cell.disabled = over || blocked[i] || occupied(i) || !legal.has(i);
        if (blocked[i]) cell.classList.add("blocked");
        if (pos[0] === i) {
          cell.classList.add("p1");
          cell.textContent = "1";
        }
        if (pos[1] === i) {
          cell.classList.add("p2");
          cell.textContent = "2";
        }
        if (legal.has(i)) cell.classList.add("legal");
      });
    }

    ctx.setNames("Người chơi 1 (Đỏ)", "Người chơi 2 (Xanh)");
    ctx.setTurn(0);
    updateStatus();
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "isolation",
    name: "Cờ Cô Lập",
    emoji: "🔒",
    description: "Di chuyển quân rồi khóa ô vừa rời. Ai làm đối thủ hết đường đi trước sẽ thắng.",
    onlineReady: true,
    options: [
      {
        id: "size",
        label: "Kích thước bàn",
        default: 7,
        choices: [
          { value: 5, label: "5x5 nhanh" },
          { value: 7, label: "7x7 chuẩn" },
          { value: 9, label: "9x9 dài" },
        ],
      },
    ],
    howTo: [
      "Mỗi người có một quân ở hai góc đối diện của bàn.",
      "Đến lượt, quân của bạn đi theo hàng ngang, dọc hoặc chéo, đi xa bao nhiêu ô cũng được nếu đường không bị chặn.",
      "Ô bạn vừa rời khỏi sẽ bị khóa vĩnh viễn, không ai được đi qua hoặc đứng lên ô đó nữa.",
      "Bạn không được nhảy qua ô khóa hoặc quân đối thủ.",
      "Sau nước đi của bạn, nếu đối thủ không còn nước hợp lệ thì bạn thắng.",
    ],
    create,
  });
})();
