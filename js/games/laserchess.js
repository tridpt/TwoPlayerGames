/* Laser Chess - xoay guong, ban tia, pha loi doi thu */
(function () {
  const N = 8;
  const DIR = {
    up: [-1, 0],
    down: [1, 0],
  };

  function create(ctx) {
    let turn = 0;
    let over = false;
    let lastBeam = [];
    let lastHit = null;
    const cells = [];
    const pieces = Array(N * N).fill(null);

    const board = document.createElement("div");
    board.className = "lc-board";
    ctx.boardEl.appendChild(board);

    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "lc-cell";
      cell.addEventListener("click", () => onCell(i));
      board.appendChild(cell);
      cells.push(cell);
    }

    setup();

    function setup() {
      setPiece(7, 0, { type: "cannon", player: 0 });
      setPiece(7, 4, { type: "core", player: 0 });
      setPiece(6, 2, { type: "mirror", player: 0, mirror: "/" });
      setPiece(6, 5, { type: "mirror", player: 0, mirror: "\\" });
      setPiece(5, 1, { type: "mirror", player: 0, mirror: "\\" });
      setPiece(5, 6, { type: "mirror", player: 0, mirror: "/" });

      setPiece(0, 7, { type: "cannon", player: 1 });
      setPiece(0, 3, { type: "core", player: 1 });
      setPiece(1, 5, { type: "mirror", player: 1, mirror: "/" });
      setPiece(1, 2, { type: "mirror", player: 1, mirror: "\\" });
      setPiece(2, 6, { type: "mirror", player: 1, mirror: "\\" });
      setPiece(2, 1, { type: "mirror", player: 1, mirror: "/" });
    }

    function setPiece(r, c, piece) {
      pieces[idx(r, c)] = piece;
    }

    function idx(r, c) { return r * N + c; }
    function row(i) { return Math.floor(i / N); }
    function col(i) { return i % N; }
    function canAct() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onCell(i) {
      if (!canAct()) return;
      const piece = pieces[i];
      if (!piece || piece.type !== "mirror" || piece.player !== turn) return;
      applyMove({ idx: i }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const i = Number(move?.idx);
      const piece = pieces[i];
      if (!Number.isInteger(i) || !piece || piece.type !== "mirror" || piece.player !== turn) return;

      piece.mirror = piece.mirror === "/" ? "\\" : "/";
      ctx.sound("rotate");
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ idx: i });

      const shot = fireLaser(turn);
      lastBeam = shot.path;
      lastHit = shot.hit;
      render();

      if (shot.winner !== null) {
        over = true;
        ctx.incScore(shot.winner);
        ctx.setTurn(-1);
        if (shot.selfHit) {
          ctx.setStatus(`🎉 Người chơi ${shot.winner + 1} thắng! Đối thủ tự bắn trúng lõi của mình.`);
        } else {
          ctx.setStatus(`🎉 Người chơi ${shot.winner + 1} thắng! Laser bắn trúng lõi đối thủ.`);
        }
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus(shot.looped);
      render();
    }

    function fireLaser(player) {
      const cannon = pieces.findIndex((piece) => piece && piece.type === "cannon" && piece.player === player);
      let r = row(cannon);
      let c = col(cannon);
      let [dr, dc] = player === 0 ? DIR.up : DIR.down;
      const path = [];
      const visited = new Set();

      for (let step = 0; step < N * N * 8; step++) {
        r += dr;
        c += dc;
        if (r < 0 || r >= N || c < 0 || c >= N) return { path, hit: null, winner: null, looped: false };

        const i = idx(r, c);
        path.push(i);
        const stateKey = `${i}:${dr}:${dc}`;
        if (visited.has(stateKey)) return { path, hit: i, winner: null, looped: true };
        visited.add(stateKey);

        const piece = pieces[i];
        if (!piece) continue;
        if (piece.type === "mirror") {
          [dr, dc] = reflect(piece.mirror, dr, dc);
          continue;
        }
        if (piece.type === "core") {
          const selfHit = piece.player === player;
          return { path, hit: i, winner: selfHit ? 1 - player : player, looped: false, selfHit };
        }
        return { path, hit: i, winner: null, looped: false };
      }

      return { path, hit: null, winner: null, looped: true };
    }

    function reflect(mirror, dr, dc) {
      return mirror === "/" ? [-dc, -dr] : [dc, dr];
    }

    function pieceLabel(piece) {
      if (piece.type === "cannon") return piece.player === 0 ? "▲" : "▼";
      if (piece.type === "core") return "◆";
      return piece.mirror;
    }

    function updateStatus(looped = false) {
      if (over) return;
      const extra = looped ? " Tia vừa bị vòng lặp và tan biến." : "";
      ctx.setStatus(`Người chơi ${turn + 1}: xoay một gương của mình để bắn laser.${extra}`);
    }

    function render() {
      const beam = new Set(lastBeam);
      cells.forEach((cell, i) => {
        const piece = pieces[i];
        cell.className = "lc-cell";
        cell.textContent = "";
        cell.disabled = true;

        if (beam.has(i)) cell.classList.add("beam");
        if (lastHit === i) cell.classList.add("hit");
        if (!piece) return;

        cell.classList.add(`p${piece.player + 1}`, piece.type);
        cell.textContent = pieceLabel(piece);
        if (piece.type === "mirror" && piece.player === turn && canAct()) {
          cell.disabled = false;
          cell.classList.add("legal");
        }
      });
    }

    ctx.setNames("Người chơi 1 (Đỏ)", "Người chơi 2 (Xanh)");
    ctx.setTurn(0);
    updateStatus();
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "laserchess",
    name: "Laser Chess",
    emoji: "🔦",
    description: "Xoay gương để phản xạ tia laser. Bắn trúng lõi đối thủ là thắng.",
    onlineReady: true,
    howTo: [
      "Mỗi người có một pháo laser, một lõi và 4 gương.",
      "Đến lượt, bấm một gương của mình để xoay giữa hai hướng / và \\.",
      "Sau khi xoay, pháo của bạn tự bắn laser. Tia đi thẳng và phản xạ khi gặp gương.",
      "Nếu laser bắn trúng lõi đối thủ, bạn thắng ngay.",
      "Cẩn thận: nếu bạn tự dẫn laser vào lõi của mình, đối thủ sẽ thắng.",
    ],
    create,
  });
})();
