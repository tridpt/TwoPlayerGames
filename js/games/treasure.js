/* Trộm Kho Báu — chơi chung máy & ONLINE (giấu thông tin)
   Mỗi người giấu NHIỀU kho báu trên lưới. Thay nhau đào ô lưới đối thủ.
   - Đào trúng kho: ghi điểm + ĐƯỢC ĐÀO TIẾP (giữ lượt).
   - Đào trượt: nhận gợi ý khoảng cách tới kho GẦN NHẤT chưa tìm, rồi chuyển lượt.
   Ai tìm đủ hết kho của đối thủ trước sẽ thắng.
   Kho báu KHÔNG gửi qua mạng. Giao thức:
     { kind:"ready" }
     { kind:"dig", r, c }
     { kind:"result", r, c, dist, hit, found, total, gameOver } */
(function () {
  function create(ctx) {
    const o = ctx.options || {};
    const N = o.size || 8;
    const NT = o.treasures || 3;     // số kho mỗi người

    let phase = "hide";
    let iReady = false, oppReady = false;
    let turn = 0;
    let awaiting = false;

    // kho của tôi (online) / cả hai (hot-seat)
    const myTreasures = [];          // [{r,c,found}]
    const localTreasures = [[], []]; // hot-seat
    let placingSeat = 0;             // hot-seat: ai đang giấu

    // tiến độ đào: số kho đã tìm được của đối thủ
    const foundByMe = [0, 0];        // [foundByP0, foundByP1] kho tìm được
    const myDigs = {};               // ô tôi đã đào trên lưới đối thủ: "r,c" -> {dist,hit}
    const oppDigsOnMe = {};          // ô đối thủ đào trên lưới tôi

    const root = document.createElement("div");
    root.className = "tr-root";
    ctx.boardEl.appendChild(root);

    const info = document.createElement("div");
    info.className = "tr-info";
    root.appendChild(info);

    const controls = document.createElement("div");
    controls.className = "tr-controls";
    const placeInfo = document.createElement("span");
    placeInfo.className = "tr-place-info";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn primary";
    confirmBtn.textContent = "✓ Sẵn sàng";
    confirmBtn.disabled = true;
    const randomBtn = document.createElement("button");
    randomBtn.className = "btn";
    randomBtn.textContent = "🎲 Giấu ngẫu nhiên";
    controls.appendChild(placeInfo);
    controls.appendChild(randomBtn);
    controls.appendChild(confirmBtn);
    root.appendChild(controls);

    const boards = document.createElement("div");
    boards.className = "tr-boards";
    root.appendChild(boards);

    const myWrap = makeBoard("Lưới của bạn");
    const oppWrap = makeBoard("Lưới đối thủ — đào tìm");
    boards.appendChild(myWrap.wrap);
    boards.appendChild(oppWrap.wrap);

    function makeBoard(title) {
      const wrap = document.createElement("div");
      wrap.className = "tr-board-wrap";
      const h = document.createElement("div");
      h.className = "tr-board-title";
      h.textContent = title;
      const grid = document.createElement("div");
      grid.className = "tr-grid";
      grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
      const cells = [];
      for (let i = 0; i < N * N; i++) {
        const cell = document.createElement("div");
        cell.className = "tr-cell";
        grid.appendChild(cell);
        cells.push(cell);
      }
      wrap.appendChild(h);
      wrap.appendChild(grid);
      return { wrap, grid, cells };
    }

    function dist(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); }
    function hintFor(d) {
      if (d <= 1) return { t: "🔥 Cực nóng", cls: "hot" };
      if (d <= 2) return { t: "♨️ Nóng", cls: "warm" };
      if (d <= 4) return { t: "🌤️ Ấm", cls: "mild" };
      return { t: "❄️ Lạnh", cls: "cold" };
    }
    // khoảng cách tới kho CHƯA tìm gần nhất trong danh sách
    function nearestUnfound(treasures, r, c) {
      let best = Infinity;
      for (const t of treasures) {
        if (t.found) continue;
        best = Math.min(best, dist({ r, c }, t));
      }
      return best;
    }

    // ====================== Giấu kho ======================
    function activeTreasures() { return ctx.isOnline ? myTreasures : localTreasures[placingSeat]; }

    myWrap.grid.addEventListener("click", (e) => {
      if (phase !== "hide") return;
      const cell = e.target.closest(".tr-cell");
      if (!cell) return;
      const i = [...myWrap.grid.children].indexOf(cell);
      const r = Math.floor(i / N), c = i % N;
      toggleTreasure(r, c);
    });

    function toggleTreasure(r, c) {
      const list = activeTreasures();
      const at = list.findIndex((t) => t.r === r && t.c === c);
      if (at >= 0) { list.splice(at, 1); }
      else if (list.length < NT) { list.push({ r, c, found: false }); }
      else { info.textContent = `Đã đủ ${NT} kho — bỏ bớt một kho nếu muốn đổi.`; return; }
      ctx.sound("select");
      renderMine();
      updatePlaceInfo();
    }

    function randomPlace() {
      const list = activeTreasures();
      list.length = 0;
      const taken = new Set();
      while (list.length < NT) {
        const i = Math.floor((ctx.isOnline ? Math.random() : Math.random()) * N * N);
        if (taken.has(i)) continue;
        taken.add(i);
        list.push({ r: Math.floor(i / N), c: i % N, found: false });
      }
      ctx.sound("place");
      renderMine();
      updatePlaceInfo();
    }
    randomBtn.addEventListener("click", () => { if (phase === "hide") randomPlace(); });

    function updatePlaceInfo() {
      const list = activeTreasures();
      placeInfo.textContent = `Giấu ${list.length}/${NT} kho 💎`;
      confirmBtn.disabled = list.length !== NT;
    }

    confirmBtn.addEventListener("click", onReady);
    function onReady() {
      if (phase !== "hide" || activeTreasures().length !== NT) return;
      if (ctx.isOnline) {
        iReady = true;
        myTreasures.forEach((t) => (t.found = false));
        controls.classList.add("tr-hidden");
        ctx.sendMove({ kind: "ready" });
        if (oppReady) beginPlay();
        else info.textContent = "Đã sẵn sàng. Đang chờ đối thủ giấu kho...";
      } else {
        if (placingSeat === 0) {
          placingSeat = 1;
          renderMine();
          updatePlaceInfo();
          info.textContent = `Người chơi 2: giấu ${NT} kho báu của bạn (Người chơi 1 đừng nhìn!).`;
        } else {
          beginPlay();
        }
      }
    }

    function beginPlay() {
      phase = "play";
      controls.classList.add("tr-hidden");
      turn = 0;
      ctx.setTurn(0);
      renderAll();
      updateStatus();
    }

    // ====================== Đào ======================
    oppWrap.grid.addEventListener("click", (e) => {
      if (phase !== "play" || awaiting) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      const cell = e.target.closest(".tr-cell");
      if (!cell) return;
      const i = [...oppWrap.grid.children].indexOf(cell);
      const r = Math.floor(i / N), c = i % N;
      if (myDigs[r + "," + c] !== undefined) return;
      dig(r, c);
    });

    function dig(r, c) {
      if (ctx.isOnline) {
        awaiting = true;
        ctx.sendMove({ kind: "dig", r, c });
        info.textContent = "Đang đào, chờ kết quả...";
      } else {
        // hot-seat: chấm trên kho của đối thủ
        const oppList = localTreasures[1 - turn];
        const hitT = oppList.find((t) => !t.found && t.r === r && t.c === c);
        if (hitT) hitT.found = true;
        const remaining = oppList.filter((t) => !t.found).length;
        const d = hitT ? 0 : nearestUnfound(oppList, r, c);
        const found = oppList.filter((t) => t.found).length;
        applyDigResult(turn, r, c, d, !!hitT, found, NT, remaining === 0);
      }
    }

    function applyDigResult(diggerSeat, r, c, d, hit, found, total, gameOver) {
      myDigs[r + "," + c] = { dist: d, hit };
      if (hit) foundByMe[diggerSeat] = found;
      ctx.sound(hit ? "capture" : (d <= 2 ? "shot" : "miss"));
      renderOpp();
      renderProgress();

      if (gameOver) return endGame(diggerSeat, `tìm đủ ${total} kho báu`);

      if (hit) {
        // trúng -> được đào tiếp (giữ lượt)
        awaiting = false;
        renderAll();
        const left = total - found;
        ctx.setStatus(`💎 Trúng kho! Còn ${left} kho. Người chơi ${diggerSeat + 1} đào tiếp!`);
        return;
      }
      // trượt -> chuyển lượt
      turn = 1 - diggerSeat;
      awaiting = false;
      ctx.setTurn(turn);
      renderAll();
      const h = hintFor(d);
      ctx.setStatus(`${h.t} (kho gần nhất cách ${d} ô). Lượt Người chơi ${turn + 1}.`);
    }

    // ====================== Online ======================
    function applyMove(move, fromRemote) {
      if (!fromRemote) return;
      if (move.kind === "ready") {
        oppReady = true;
        if (iReady) beginPlay();
        else info.textContent = "Đối thủ đã sẵn sàng. Hãy giấu kho và bấm Sẵn sàng.";
        return;
      }
      if (move.kind === "dig") {
        // đối thủ đào lưới của TÔI -> tôi chấm
        const opp = 1 - ctx.mySeat;
        const hitT = myTreasures.find((t) => !t.found && t.r === move.r && t.c === move.c);
        if (hitT) hitT.found = true;
        const found = myTreasures.filter((t) => t.found).length;
        const remaining = NT - found;
        const d = hitT ? 0 : nearestUnfound(myTreasures, move.r, move.c);
        oppDigsOnMe[move.r + "," + move.c] = { dist: d, hit: !!hitT };
        ctx.sendMove({ kind: "result", r: move.r, c: move.c, dist: d, hit: !!hitT, found, total: NT, gameOver: remaining === 0 });
        renderMine();
        renderProgress();
        if (remaining === 0) { endGame(opp, "kho của bạn đã bị tìm hết"); return; }
        if (hitT) {
          // đối thủ trúng -> họ đào tiếp, vẫn lượt của họ
          ctx.setStatus("💥 Đối thủ tìm thấy 1 kho của bạn và được đào tiếp...");
        } else {
          turn = ctx.mySeat;
          ctx.setTurn(turn);
          renderAll();
          updateStatus();
        }
        return;
      }
      if (move.kind === "result") {
        applyDigResult(ctx.mySeat, move.r, move.c, move.dist, move.hit, move.found, move.total, move.gameOver);
        return;
      }
    }

    function endGame(winnerSeat, reason) {
      phase = "over";
      ctx.setTurn(-1);
      // lộ kho còn lại của mình cho đẹp
      renderMine(true);
      if (ctx.isOnline) {
        if (winnerSeat === ctx.mySeat) { ctx.incScore(ctx.mySeat); ctx.setStatus(`🎉 Bạn thắng — ${reason}!`); }
        else ctx.setStatus(`💀 Bạn thua — ${reason}.`);
      } else {
        ctx.incScore(winnerSeat);
        ctx.setStatus(`🎉 Người chơi ${winnerSeat + 1} thắng — ${reason}!`);
      }
    }

    // ====================== Render ======================
    function renderProgress() {
      const me = ctx.isOnline ? ctx.mySeat : 0;
      // foundByMe[seat] = số kho seat đã tìm được của đối thủ
      const p0 = foundByMe[0], p1 = foundByMe[1];
      info.innerHTML =
        `<span class="tr-prog tr-p1">P1: ${"💎".repeat(p0)}${"·".repeat(Math.max(0, NT - p0))}</span>` +
        `<span class="tr-prog tr-p2">P2: ${"💎".repeat(p1)}${"·".repeat(Math.max(0, NT - p1))}</span>`;
    }

    function renderMine(reveal) {
      const list = ctx.isOnline ? myTreasures : localTreasures[placingSeat];
      myWrap.cells.forEach((cell, i) => {
        const r = Math.floor(i / N), c = i % N;
        cell.className = "tr-cell";
        cell.textContent = "";
        const isT = list.some((t) => t.r === r && t.c === c);
        if (isT && (phase === "hide" || reveal)) { cell.classList.add("treasure"); cell.textContent = "💎"; }
        const dug = oppDigsOnMe[r + "," + c];
        if (dug) {
          cell.classList.add("dug");
          if (dug.hit) { cell.classList.add("hit"); cell.textContent = "💎"; }
          else cell.textContent = dug.dist;
        }
      });
    }

    function renderOpp() {
      oppWrap.cells.forEach((cell, i) => {
        const r = Math.floor(i / N), c = i % N;
        cell.className = "tr-cell";
        cell.textContent = "";
        const dug = myDigs[r + "," + c];
        if (dug) {
          if (dug.hit) { cell.classList.add("dug", "hit"); cell.textContent = "💎"; }
          else { cell.classList.add("dug", hintFor(dug.dist).cls); cell.textContent = dug.dist; }
        }
      });
      const myMove = phase === "play" && (!ctx.isOnline || turn === ctx.mySeat) && !awaiting;
      oppWrap.wrap.classList.toggle("tr-active", myMove);
    }

    function renderAll() { renderMine(); renderOpp(); }

    function updateStatus() {
      if (phase !== "play") return;
      const mine = !ctx.isOnline || turn === ctx.mySeat;
      ctx.setStatus(mine ? "🔍 Lượt bạn — đào tìm kho trên lưới đối thủ!" : "⏳ Đối thủ đang đào...");
    }

    // ====================== Khởi tạo ======================
    updatePlaceInfo();
    if (ctx.isOnline) {
      info.textContent = `Giấu ${NT} kho 💎 trên LƯỚI CỦA BẠN (bấm để đặt/bỏ, hoặc 🎲 ngẫu nhiên), rồi Sẵn sàng.`;
    } else {
      info.textContent = `Người chơi 1: giấu ${NT} kho 💎 trên lưới của bạn.`;
    }
    ctx.setStatus("Giấu kho báu để bắt đầu.");
    renderAll();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "treasure",
    name: "Trộm Kho Báu",
    emoji: "💎",
    description: "Giấu nhiều kho báu, đào tìm kho đối thủ theo gợi ý nóng/lạnh. Trúng được đào tiếp. Tìm hết kho địch thì thắng.",
    onlineReady: true,
    options: [
      {
        id: "size", label: "Kích thước lưới", default: 8,
        choices: [
          { value: 6, label: "6×6 (nhỏ)" },
          { value: 8, label: "8×8 (chuẩn)" },
          { value: 10, label: "10×10 (lớn)" },
        ],
      },
      {
        id: "treasures", label: "Số kho mỗi người", default: 3,
        choices: [
          { value: 1, label: "1 kho (nhanh)" },
          { value: 3, label: "3 kho (chuẩn)" },
          { value: 5, label: "5 kho (lâu)" },
        ],
      },
    ],
    howTo: [
      "Đầu ván: giấu các kho báu 💎 trên LƯỚI CỦA BẠN — bấm ô để đặt/bỏ, hoặc bấm '🎲 Giấu ngẫu nhiên'. Đủ số kho thì bấm 'Sẵn sàng'.",
      "Khi cả hai xong, thay nhau ĐÀO ô trên 'Lưới đối thủ'.",
      "Đào TRƯỢT: nhận gợi ý khoảng cách tới kho GẦN NHẤT chưa tìm — 🔥 cực nóng, ♨️ nóng, 🌤️ ấm, ❄️ lạnh (kèm số ô), rồi chuyển lượt.",
      "Đào TRÚNG kho: ghi được kho đó và ĐƯỢC ĐÀO TIẾP (giữ lượt) — nên trúng liên tiếp có thể lật ngược thế cờ.",
      "Con số trên ô đã đào là khoảng cách Manhattan tới kho gần nhất lúc đó — dùng để khoanh vùng.",
      "Ai tìm đủ HẾT số kho của đối thủ trước sẽ thắng.",
    ],
    create,
  });
})();
