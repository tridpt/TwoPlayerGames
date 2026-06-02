/* Cờ Ba Quân (Three Men's Morris) — chơi chung máy & online
   Bàn 3x3 (9 điểm). Giai đoạn 1: mỗi người đặt 3 quân.
   Giai đoạn 2: di chuyển quân sang điểm kề trống. Xếp 3 quân thẳng hàng để thắng.
   Nước đi: { type:"place", to } hoặc { type:"move", from, to }. */
(function () {
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  // điểm kề nhau (cho phép di chuyển dọc/ngang/chéo qua tâm)
  const ADJ = {
    0: [1, 3, 4], 1: [0, 2, 4], 2: [1, 4, 5],
    3: [0, 4, 6], 4: [0, 1, 2, 3, 5, 6, 7, 8], 5: [2, 4, 8],
    6: [3, 4, 7], 7: [4, 6, 8], 8: [4, 5, 7],
  };

  function create(ctx) {
    let board = Array(9).fill(null);
    let turn = 0;
    let placed = [0, 0];     // số quân đã đặt mỗi người
    let phase = "place";     // place | move
    let selected = null;     // điểm đang chọn để di chuyển
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "mor-wrap";
    ctx.boardEl.appendChild(wrap);

    const grid = document.createElement("div");
    grid.className = "mor-board";
    wrap.appendChild(grid);

    // vẽ các đường nối làm nền
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "mor-lines");
    svg.setAttribute("viewBox", "0 0 100 100");
    const segs = [
      [0, 0, 100, 0], [0, 50, 100, 50], [0, 100, 100, 100],
      [0, 0, 0, 100], [50, 0, 50, 100], [100, 0, 100, 100],
      [0, 0, 100, 100], [100, 0, 0, 100],
    ];
    segs.forEach(([x1, y1, x2, y2]) => {
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
      ln.setAttribute("stroke", "rgba(255,255,255,0.25)");
      ln.setAttribute("stroke-width", "1.5");
      svg.appendChild(ln);
    });
    grid.appendChild(svg);

    const spotEls = [];
    for (let i = 0; i < 9; i++) {
      const spot = document.createElement("div");
      spot.className = "mor-spot";
      spot.style.left = `${(i % 3) * 50}%`;
      spot.style.top = `${Math.floor(i / 3) * 50}%`;
      spot.addEventListener("click", () => onClick(i));
      grid.appendChild(spot);
      spotEls.push(spot);
    }

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function onClick(i) {
      if (!canPlay()) return;
      if (phase === "place") {
        if (board[i] !== null) return;
        applyMove({ type: "place", to: i }, false);
        return;
      }
      // phase move
      if (selected === null) {
        if (board[i] === turn) { selected = i; render(); }
        return;
      }
      if (i === selected) { selected = null; render(); return; }
      if (board[i] === turn) { selected = i; render(); return; } // đổi quân chọn
      if (board[i] === null && ADJ[selected].includes(i)) {
        applyMove({ type: "move", from: selected, to: i }, false);
      }
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      if (move.type === "place") {
        if (board[move.to] !== null) return;
        board[move.to] = turn;
        placed[turn]++;
      } else {
        if (board[move.from] !== turn || board[move.to] !== null || !ADJ[move.from].includes(move.to)) return;
        board[move.from] = null;
        board[move.to] = turn;
      }
      selected = null;

      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
      ctx.sound(move.type === "move" ? "select" : "place");

      if (hasLine(turn)) {
        over = true;
        highlight(turn);
        ctx.incScore(turn);
        ctx.setStatus(`🎉 Người chơi ${turn + 1} xếp 3 quân thẳng hàng — chiến thắng!`);
        ctx.setTurn(-1);
        render();
        return;
      }

      // chuyển sang giai đoạn di chuyển khi cả hai đặt đủ 3 quân
      if (phase === "place" && placed[0] === 3 && placed[1] === 3) phase = "move";

      turn = 1 - turn;
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function hasLine(p) {
      return LINES.some((l) => l.every((i) => board[i] === p));
    }

    function highlight(p) {
      const line = LINES.find((l) => l.every((i) => board[i] === p));
      if (line) line.forEach((i) => spotEls[i].classList.add("win"));
    }

    function render() {
      const movable = phase === "move" && selected !== null
        ? ADJ[selected].filter((i) => board[i] === null) : [];
      const moveSet = new Set(movable);
      for (let i = 0; i < 9; i++) {
        const spot = spotEls[i];
        spot.className = "mor-spot";
        spot.style.left = `${(i % 3) * 50}%`;
        spot.style.top = `${Math.floor(i / 3) * 50}%`;
        spot.innerHTML = "";
        if (board[i] !== null) {
          const m = document.createElement("div");
          m.className = "mor-piece " + (board[i] === 0 ? "p1" : "p2");
          spot.appendChild(m);
        }
        if (selected === i) spot.classList.add("sel");
        if (moveSet.has(i)) spot.classList.add("hint");
      }
    }

    function updateStatus() {
      if (phase === "place") {
        const left = 3 - placed[turn];
        ctx.setStatus(`Giai đoạn đặt quân — Người chơi ${turn + 1} còn ${left} quân để đặt.`);
      } else {
        ctx.setStatus(`Giai đoạn di chuyển — Người chơi ${turn + 1}: chọn quân của mình rồi đi sang điểm kề trống.`);
      }
    }

    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "morris",
    name: "Cờ Ba Quân (Morris)",
    emoji: "⭕",
    description: "Đặt 3 quân rồi di chuyển chúng để xếp thành hàng. Cờ caro phiên bản có di chuyển.",
    onlineReady: true,
    howTo: [
      "Bàn có 9 điểm nối với nhau. Mỗi người có 3 quân (Người chơi 1 đỏ, Người chơi 2 xanh).",
      "Giai đoạn 1 (đặt quân): hai người luân phiên đặt 3 quân của mình lên các điểm trống.",
      "Giai đoạn 2 (di chuyển): khi cả hai đã đặt đủ, đến lượt mình hãy bấm chọn một quân của bạn, rồi bấm vào một điểm KỀ còn trống để di chuyển sang đó (các điểm đi được sẽ sáng lên).",
      "Mục tiêu: xếp 3 quân của mình thẳng hàng (ngang, dọc, hoặc chéo qua tâm).",
      "Vì có thể di chuyển nên ván cờ không bao giờ bế tắc — hãy vừa tấn công vừa chặn đối thủ.",
    ],
    create,
  });
})();
