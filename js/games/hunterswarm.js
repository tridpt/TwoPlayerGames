/* Hunter vs Swarm - co chien thuat bat doi xung */
(function () {
  const N = 7;
  const CAPTURE_TARGET = 8;
  const SURVIVE_TURNS = 20;
  const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  const HUNTERS = [[3, 2], [3, 4]];
  const SWARM = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [2, 0], [4, 6],
  ];

  function create(ctx) {
    const cells = Array(N * N).fill(null);
    let turn = 0;
    let over = false;
    let selected = -1;
    let captured = 0;
    let swarmTurns = 0;

    const root = document.createElement("div");
    root.className = "hs-wrap";
    root.innerHTML = `
      <div class="hs-info">
        <span>Thợ săn bắt <b class="hs-captured">0/${CAPTURE_TARGET}</b></span>
        <span>Bầy còn <b class="hs-left">${SWARM.length}</b></span>
        <span>Sống sót <b class="hs-survive">0/${SURVIVE_TURNS}</b></span>
      </div>
      <div class="hs-board"></div>
    `;
    ctx.boardEl.appendChild(root);

    const board = root.querySelector(".hs-board");
    const capturedEl = root.querySelector(".hs-captured");
    const leftEl = root.querySelector(".hs-left");
    const surviveEl = root.querySelector(".hs-survive");
    const cellEls = [];

    HUNTERS.forEach(([r, c], id) => {
      cells[idx(r, c)] = { side: 0, kind: "hunter", id };
    });
    SWARM.forEach(([r, c], id) => {
      cells[idx(r, c)] = { side: 1, kind: "swarm", id };
    });

    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "hs-cell";
      cell.addEventListener("click", () => onCell(i));
      board.appendChild(cell);
      cellEls.push(cell);
    }

    function idx(r, c) { return r * N + c; }
    function row(i) { return Math.floor(i / N); }
    function col(i) { return i % N; }
    function inside(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
    function canAct() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function swarmLeft() {
      return cells.filter((cell) => cell && cell.side === 1).length;
    }

    function alliedSwarmAround(i) {
      const r = row(i);
      const c = col(i);
      let count = 0;
      DIRS.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (!inside(nr, nc)) return;
        const neighbor = cells[idx(nr, nc)];
        if (neighbor && neighbor.side === 1) count++;
      });
      return count;
    }

    function isGuardedSwarm(i) {
      const piece = cells[i];
      return !!piece && piece.side === 1 && alliedSwarmAround(i) >= 2;
    }

    function legalMovesFrom(from) {
      const piece = cells[from];
      if (!piece || piece.side !== turn) return [];
      return piece.side === 0 ? legalHunterMoves(from) : legalSwarmMoves(from);
    }

    function legalHunterMoves(from) {
      const moves = [];
      const sr = row(from);
      const sc = col(from);
      DIRS.forEach(([dr, dc]) => {
        const r1 = sr + dr;
        const c1 = sc + dc;
        if (!inside(r1, c1)) return;
        const first = idx(r1, c1);
        const firstPiece = cells[first];
        if (!firstPiece) {
          moves.push(first);
          const r2 = r1 + dr;
          const c2 = c1 + dc;
          if (!inside(r2, c2)) return;
          const second = idx(r2, c2);
          if (!cells[second]) moves.push(second);
          return;
        }
        if (firstPiece.side === 1 && !isGuardedSwarm(first)) moves.push(first);
      });
      return moves;
    }

    function legalSwarmMoves(from) {
      const moves = [];
      const sr = row(from);
      const sc = col(from);
      DIRS.forEach(([dr, dc]) => {
        const nr = sr + dr;
        const nc = sc + dc;
        if (!inside(nr, nc)) return;
        const target = idx(nr, nc);
        if (!cells[target]) moves.push(target);
      });
      return moves;
    }

    function allLegalMoves(player) {
      const oldTurn = turn;
      turn = player;
      const moves = [];
      cells.forEach((piece, from) => {
        if (!piece || piece.side !== player) return;
        legalMovesFrom(from).forEach((to) => moves.push({ from, to }));
      });
      turn = oldTurn;
      return moves;
    }

    function onCell(i) {
      if (!canAct()) return;
      const piece = cells[i];
      if (piece && piece.side === turn) {
        selected = selected === i ? -1 : i;
        updateStatus();
        render();
        return;
      }
      if (selected < 0) return;
      if (!legalMovesFrom(selected).includes(i)) return;
      applyMove({ from: selected, to: i }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const from = Number(move?.from);
      const to = Number(move?.to);
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;
      if (from < 0 || from >= cells.length || to < 0 || to >= cells.length) return;

      const piece = cells[from];
      if (!piece || piece.side !== turn) return;
      const legal = legalMovesFrom(from);
      if (!legal.includes(to)) return;

      const target = cells[to];
      const didCapture = piece.side === 0 && target && target.side === 1;
      if (didCapture) captured++;
      cells[to] = piece;
      cells[from] = null;
      selected = -1;
      ctx.sound(didCapture ? "capture" : "place");

      if (piece.side === 1) swarmTurns++;
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ from, to });

      if (checkEnd(piece.side)) {
        render();
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
      render();
    }

    function checkEnd(lastMover) {
      if (captured >= CAPTURE_TARGET || swarmLeft() === 0) {
        finish(0, `🎉 Thợ săn thắng! Đã bắt đủ ${CAPTURE_TARGET} quân Bầy đàn.`);
        return true;
      }
      if (allLegalMoves(0).length === 0) {
        finish(1, "🎉 Bầy đàn thắng! Cả hai thợ săn đã bị khóa đường.");
        return true;
      }
      if (allLegalMoves(1).length === 0) {
        finish(0, "🎉 Thợ săn thắng! Bầy đàn không còn quân nào di chuyển được.");
        return true;
      }
      if (lastMover === 1 && swarmTurns >= SURVIVE_TURNS) {
        finish(1, `🎉 Bầy đàn thắng! Đã sống sót qua ${SURVIVE_TURNS} lượt mà chưa bị quét sạch.`);
        return true;
      }
      return false;
    }

    function finish(winner, text) {
      over = true;
      ctx.incScore(winner);
      ctx.setTurn(-1);
      ctx.setStatus(text);
    }

    function updateStatus() {
      if (over) return;
      if (selected >= 0) {
        const moves = legalMovesFrom(selected).length;
        const action = turn === 0 ? "di chuyển hoặc bắt quân lẻ" : "di chuyển để bao vây";
        ctx.setStatus(`${turn === 0 ? "Thợ săn" : "Bầy đàn"}: chọn ô đến để ${action}. Có ${moves} nước.`);
        return;
      }
      if (turn === 0) {
        ctx.setStatus(`Thợ săn: chọn 1 trong 2 quân. Bắt ${captured}/${CAPTURE_TARGET}, Bầy còn ${swarmLeft()}.`);
      } else {
        ctx.setStatus(`Bầy đàn: chọn một quân để áp sát, bảo vệ nhau và khóa đường. Sống sót ${swarmTurns}/${SURVIVE_TURNS} lượt.`);
      }
    }

    function render() {
      const legalTargets = new Set();
      const activeSources = new Set();
      if (canAct()) {
        cells.forEach((piece, i) => {
          if (!piece || piece.side !== turn) return;
          const moves = legalMovesFrom(i);
          if (moves.length) activeSources.add(i);
        });
        if (selected >= 0) legalMovesFrom(selected).forEach((to) => legalTargets.add(to));
      }

      capturedEl.textContent = `${captured}/${CAPTURE_TARGET}`;
      leftEl.textContent = String(swarmLeft());
      surviveEl.textContent = `${swarmTurns}/${SURVIVE_TURNS}`;

      cellEls.forEach((el, i) => {
        const piece = cells[i];
        el.className = "hs-cell";
        el.textContent = "";
        const interactive = canAct() && (activeSources.has(i) || legalTargets.has(i));
        el.disabled = !interactive;

        if ((row(i) + col(i)) % 2 === 0) el.classList.add("alt");
        if (piece) {
          el.classList.add(piece.kind, `p${piece.side + 1}`);
          if (piece.side === 0) {
            el.textContent = "H";
          } else {
            const guarded = isGuardedSwarm(i);
            el.textContent = guarded ? "S" : "s";
            if (guarded) el.classList.add("guarded");
          }
        }
        if (activeSources.has(i)) el.classList.add("source");
        if (selected === i) el.classList.add("selected");
        if (legalTargets.has(i)) {
          el.classList.add("legal");
          if (piece && piece.side !== turn) el.classList.add("capture");
        }
      });
    }

    ctx.setNames("Thợ săn", "Bầy đàn");
    ctx.setTurn(0);
    updateStatus();
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "hunterswarm",
    name: "Thợ Săn & Bầy Đàn",
    emoji: "⚔️",
    description: "Cờ chiến thuật bất đối xứng: 2 thợ săn mạnh đối đầu 12 quân bầy yếu biết bảo vệ nhau và khóa đường.",
    onlineReady: true,
    howTo: [
      "Người chơi 1 điều khiển 2 Thợ săn. Người chơi 2 điều khiển 12 quân Bầy đàn.",
      "Thợ săn đi tối đa 2 ô theo ngang, dọc hoặc chéo nếu đường trống. Nếu ô kề bên có quân Bầy không được bảo vệ, Thợ săn có thể đi vào đó để bắt.",
      "Bầy đàn mỗi lượt di chuyển 1 quân sang ô trống kề bên theo ngang, dọc hoặc chéo.",
      "Một quân Bầy đứng cạnh ít nhất 2 đồng minh sẽ được bảo vệ, Thợ săn không thể bắt trực tiếp quân đó.",
      "Thợ săn thắng khi bắt đủ 8 quân Bầy. Bầy đàn thắng nếu khóa cả hai Thợ săn hoặc sống sót qua 20 lượt Bầy.",
    ],
    create,
  });
})();
