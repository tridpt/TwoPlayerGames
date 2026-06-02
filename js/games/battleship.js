/* Battleship - Bắn Tàu (CHỈ chơi online) — giấu thông tin giữa 2 người
   Giao thức qua sendMove:
     { kind:"ready" }                         -> báo đã sẵn sàng
     { kind:"shot", r, c }                    -> bắn vào ô (r,c) trên bàn đối thủ
     { kind:"result", r, c, hit, sunk,
       sunkCells, gameOver }                  -> chủ bàn trả kết quả
   Quân tàu KHÔNG bao giờ gửi qua mạng — chỉ gửi phát bắn & kết quả. */
(function () {
  const N = 10;
  const FLEET = [5, 4, 3, 3, 2]; // kích thước các tàu

  function create(ctx) {
    // ----- trạng thái -----
    let phase = "placing";       // placing | playing | over
    let iReady = false, oppReady = false;
    let turn = 0;                // seat nào được bắn
    let awaiting = false;        // đang chờ kết quả phát bắn của mình

    // bàn của tôi: shipId hoặc null + dấu bắn của đối thủ
    let myBoard = empty(null);
    let ships = [];              // {id, cells:[[r,c]], size, hits}
    let oppShotsOnMe = empty(0); // 0 chưa bắn, "hit", "miss"
    // bàn đối thủ (theo dõi phát bắn của tôi)
    let myShots = empty(0);      // 0 chưa bắn, "hit", "miss", "sunk"

    function empty(v) { return Array.from({ length: N }, () => Array(N).fill(v)); }

    // ----- giao diện -----
    const root = document.createElement("div");
    root.className = "bs-root";
    ctx.boardEl.appendChild(root);

    const controls = document.createElement("div");
    controls.className = "bs-controls";
    const shuffleBtn = document.createElement("button");
    shuffleBtn.className = "btn";
    shuffleBtn.textContent = "🔀 Xếp lại";
    const readyBtn = document.createElement("button");
    readyBtn.className = "btn primary";
    readyBtn.textContent = "✓ Sẵn sàng";
    controls.appendChild(shuffleBtn);
    controls.appendChild(readyBtn);
    root.appendChild(controls);

    const boards = document.createElement("div");
    boards.className = "bs-boards";
    root.appendChild(boards);

    const myWrap = makeBoard("Bàn của bạn");
    const oppWrap = makeBoard("Bàn đối thủ");
    boards.appendChild(myWrap.wrap);
    boards.appendChild(oppWrap.wrap);

    function makeBoard(title) {
      const wrap = document.createElement("div");
      wrap.className = "bs-board-wrap";
      const h = document.createElement("div");
      h.className = "bs-board-title";
      h.textContent = title;
      const grid = document.createElement("div");
      grid.className = "bs-grid";
      const cells = Array.from({ length: N }, () => Array(N));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "bs-cell";
          grid.appendChild(cell);
          cells[r][c] = cell;
        }
      }
      wrap.appendChild(h);
      wrap.appendChild(grid);
      return { wrap, grid, cells };
    }

    // ----- xếp tàu ngẫu nhiên -----
    function placeRandom() {
      myBoard = empty(null);
      ships = [];
      FLEET.forEach((size, id) => {
        let placed = false;
        while (!placed) {
          const horiz = Math.random() < 0.5;
          const r = Math.floor(Math.random() * N);
          const c = Math.floor(Math.random() * N);
          const cells = [];
          for (let k = 0; k < size; k++) {
            const rr = horiz ? r : r + k;
            const cc = horiz ? c + k : c;
            if (rr >= N || cc >= N || myBoard[rr][cc] !== null) { cells.length = 0; break; }
            cells.push([rr, cc]);
          }
          if (cells.length === size) {
            cells.forEach(([rr, cc]) => { myBoard[rr][cc] = id; });
            ships.push({ id, cells, size, hits: 0 });
            placed = true;
          }
        }
      });
    }

    shuffleBtn.addEventListener("click", () => {
      if (phase !== "placing" || iReady) return;
      placeRandom();
      render();
    });

    readyBtn.addEventListener("click", () => {
      if (phase !== "placing" || iReady) return;
      iReady = true;
      shuffleBtn.disabled = true;
      readyBtn.disabled = true;
      readyBtn.textContent = "✓ Đã sẵn sàng";
      ctx.sendMove({ kind: "ready" });
      if (oppReady) beginPlay();
      else ctx.setStatus("Đã sẵn sàng. Đang chờ đối thủ xếp tàu...");
    });

    function beginPlay() {
      phase = "playing";
      turn = 0;
      controls.classList.add("bs-hidden");
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    // ----- nhận message từ đối thủ -----
    function applyMove(move, fromRemote) {
      if (!fromRemote) return; // mọi nước local đã xử lý trực tiếp
      if (move.kind === "ready") {
        oppReady = true;
        if (iReady) beginPlay();
        else ctx.setStatus("Đối thủ đã sẵn sàng. Hãy xếp tàu và bấm \"Sẵn sàng\".");
        return;
      }
      if (move.kind === "shot") {
        // đối thủ bắn vào bàn của tôi
        const { r, c } = move;
        const result = receiveShot(r, c);
        ctx.sendMove({ kind: "result", r, c, ...result });
        // sau phát bắn, đến lượt tôi
        if (!result.gameOver) {
          turn = ctx.mySeat;
          ctx.setTurn(turn);
          updateStatus();
        } else {
          endGame(false); // tôi thua (tàu tôi đã chìm hết)
        }
        render();
        return;
      }
      if (move.kind === "result") {
        // kết quả phát bắn của tôi lên bàn đối thủ
        const { r, c, hit, sunk, sunkCells, gameOver } = move;
        myShots[r][c] = hit ? "hit" : "miss";
        if (sunk && sunkCells) sunkCells.forEach(([rr, cc]) => { myShots[rr][cc] = "sunk"; });
        awaiting = false;
        if (gameOver) { render(); return endGame(true); } // tôi thắng
        turn = 1 - ctx.mySeat;
        ctx.setTurn(turn);
        render();
        if (hit) ctx.setStatus(sunk ? "💥 Trúng và đánh chìm! Đến lượt đối thủ." : "💥 Bắn trúng! Đến lượt đối thủ.");
        else ctx.setStatus("🌊 Trượt. Đến lượt đối thủ.");
        return;
      }
    }

    // tính kết quả khi tôi bị bắn tại (r,c)
    function receiveShot(r, c) {
      const id = myBoard[r][c];
      if (id === null) {
        oppShotsOnMe[r][c] = "miss";
        return { hit: false, sunk: false, gameOver: false };
      }
      oppShotsOnMe[r][c] = "hit";
      const ship = ships[id];
      ship.hits++;
      const sunk = ship.hits >= ship.size;
      const allSunk = ships.every((s) => s.hits >= s.size);
      return {
        hit: true,
        sunk,
        sunkCells: sunk ? ship.cells : null,
        gameOver: allSunk,
      };
    }

    // ----- tôi bắn (click bàn đối thủ) -----
    oppWrap.grid.addEventListener("click", (e) => {
      if (phase !== "playing" || awaiting) return;
      if (turn !== ctx.mySeat) return;
      const idx = [...oppWrap.grid.children].indexOf(e.target.closest(".bs-cell"));
      if (idx < 0) return;
      const r = Math.floor(idx / N), c = idx % N;
      if (myShots[r][c] !== 0) return; // đã bắn rồi
      awaiting = true;
      myShots[r][c] = "pending";
      render();
      ctx.sendMove({ kind: "shot", r, c });
      ctx.setStatus("Đã bắn, chờ kết quả...");
    });

    function endGame(iWon) {
      phase = "over";
      ctx.setTurn(-1);
      if (iWon) { ctx.incScore(ctx.mySeat); ctx.setStatus("🎉 Bạn thắng — đã đánh chìm toàn bộ hạm đội đối thủ!"); }
      else { ctx.incScore(1 - ctx.mySeat); ctx.setStatus("💀 Bạn thua — hạm đội của bạn đã bị đánh chìm."); }
    }

    function render() {
      // bàn của tôi: hiện tàu + dấu bắn của đối thủ
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = myWrap.cells[r][c];
          cell.className = "bs-cell";
          if (myBoard[r][c] !== null) cell.classList.add("ship");
          if (oppShotsOnMe[r][c] === "hit") cell.classList.add("hit");
          else if (oppShotsOnMe[r][c] === "miss") cell.classList.add("miss");
        }
      }
      // bàn đối thủ: chỉ hiện dấu bắn của tôi
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = oppWrap.cells[r][c];
          cell.className = "bs-cell";
          const s = myShots[r][c];
          if (s === "hit") cell.classList.add("hit");
          else if (s === "sunk") cell.classList.add("hit", "sunk");
          else if (s === "miss") cell.classList.add("miss");
          else if (s === "pending") cell.classList.add("pending");
        }
      }
      const myTurn = phase === "playing" && turn === ctx.mySeat && !awaiting;
      oppWrap.wrap.classList.toggle("bs-active", myTurn);
    }

    function updateStatus() {
      if (phase !== "playing") return;
      ctx.setStatus(turn === ctx.mySeat
        ? "🎯 Lượt bạn — bấm vào bàn đối thủ để bắn!"
        : "⏳ Đối thủ đang ngắm bắn...");
    }

    // ----- khởi tạo -----
    if (!ctx.isOnline) {
      ctx.setStatus("⚠️ Bắn Tàu chỉ chơi được ở chế độ online.");
      return { applyMove: () => {} };
    }
    placeRandom();
    render();
    ctx.setStatus("Xếp tàu (bấm \"Xếp lại\" để đổi vị trí), rồi bấm \"Sẵn sàng\".");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "battleship",
    name: "Bắn Tàu (Battleship)",
    emoji: "🚢",
    description: "Giấu hạm đội và bắn tọa độ vào bàn đối thủ. Ai bắn chìm hết tàu địch trước sẽ thắng. (Chỉ online)",
    onlineReady: true,
    localReady: false,
    howTo: [
      "Đây là game CHỈ chơi online — vì mỗi người có hạm đội giấu kín với đối thủ.",
      "Đầu ván, hệ thống tự xếp 5 tàu (cỡ 5, 4, 3, 3, 2) lên bàn của bạn. Bấm \"Xếp lại\" để đổi vị trí ngẫu nhiên, ưng ý thì bấm \"Sẵn sàng\".",
      "Khi cả hai sẵn sàng, hai bên luân phiên bắn. Đến lượt mình, bấm một ô trên 'Bàn đối thủ' để bắn vào tọa độ đó.",
      "Ô đỏ = bắn trúng tàu, ô trắng = trượt. Bắn trúng hết các ô của một tàu là đánh chìm tàu đó.",
      "Bàn bên trái là của bạn — bạn sẽ thấy đối thủ bắn trúng/trượt tàu mình ở đâu.",
      "Ai đánh chìm toàn bộ hạm đội đối thủ trước sẽ thắng.",
    ],
    create,
  });
})();
