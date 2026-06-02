/* Trộm Kho Báu — chơi chung máy & ONLINE (giấu thông tin)
   Mỗi người giấu một kho báu trên lưới của mình. Thay nhau đào ô trên lưới đối thủ.
   Mỗi lần đào nhận gợi ý khoảng cách (nóng/ấm/lạnh) tới kho báu.
   Ai đào trúng kho báu của đối thủ trước sẽ thắng.
   Kho báu KHÔNG gửi qua mạng. Giao thức:
     { kind:"hide", r, c } (chỉ để báo đã sẵn sàng — KHÔNG gửi tọa độ thật)
     -> thực tế gửi { kind:"ready" }
     { kind:"dig", r, c }  -> đối thủ chấm và trả { kind:"result", r, c, dist, found } */
(function () {
  function create(ctx) {
    const o = ctx.options || {};
    const N = o.size || 7;

    let phase = "hide";   // hide | play | over
    let myTreasure = null; // {r,c} kho báu của tôi
    let iReady = false, oppReady = false;
    let turn = 0;
    let awaiting = false;
    const myDigs = {};     // "r,c" -> dist (đào của tôi trên lưới đối thủ)
    const oppDigsOnMe = {};// các ô đối thủ đã đào trên lưới của tôi

    const root = document.createElement("div");
    root.className = "tr-root";
    ctx.boardEl.appendChild(root);

    const info = document.createElement("div");
    info.className = "tr-info";
    root.appendChild(info);

    const boards = document.createElement("div");
    boards.className = "tr-boards";
    root.appendChild(boards);

    const myWrap = makeBoard("Lưới của bạn (giấu kho báu)");
    const oppWrap = makeBoard("Lưới đối thủ (đào tìm)");
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

    function idx(r, c) { return r * N + c; }
    function dist(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); } // Manhattan

    function hintFor(d) {
      if (d === 0) return { t: "🎯 TRÚNG!", cls: "hit" };
      if (d <= 1) return { t: "🔥 Cực nóng", cls: "hot" };
      if (d <= 2) return { t: "♨️ Nóng", cls: "warm" };
      if (d <= 4) return { t: "🌤️ Ấm", cls: "mild" };
      return { t: "❄️ Lạnh", cls: "cold" };
    }

    // ----- giai đoạn giấu kho báu -----
    myWrap.cells.forEach((cell, i) => {
      cell.addEventListener("click", () => {
        if (phase !== "hide") return;
        const r = Math.floor(i / N), c = i % N;
        myTreasure = { r, c };
        renderMine();
        confirmBtn.disabled = false;
        info.textContent = `Đã chọn chỗ giấu (${r + 1},${c + 1}). Bấm "Sẵn sàng" hoặc chọn lại.`;
      });
    });

    oppWrap.grid.addEventListener("click", (e) => {
      if (phase !== "play" || awaiting) return;
      if (turn !== (ctx.isOnline ? ctx.mySeat : turn)) return;
      if (ctx.isOnline && turn !== ctx.mySeat) return;
      const cell = e.target.closest(".tr-cell");
      if (!cell) return;
      const i = [...oppWrap.grid.children].indexOf(cell);
      if (i < 0) return;
      const r = Math.floor(i / N), c = i % N;
      if (myDigs[r + "," + c] !== undefined) return; // đã đào
      dig(r, c);
    });

    const controls = document.createElement("div");
    controls.className = "tr-controls";
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn primary";
    confirmBtn.textContent = "✓ Sẵn sàng";
    confirmBtn.disabled = true;
    confirmBtn.addEventListener("click", onReady);
    controls.appendChild(confirmBtn);
    root.insertBefore(controls, boards);

    function onReady() {
      if (phase !== "hide" || !myTreasure) return;
      iReady = true;
      confirmBtn.disabled = true;
      controls.classList.add("tr-hidden");
      if (ctx.isOnline) {
        ctx.sendMove({ kind: "ready" });
        if (oppReady) beginPlay();
        else info.textContent = "Đã sẵn sàng. Đang chờ đối thủ giấu kho báu...";
      } else {
        // chung máy: người 2 giấu tiếp
        if (!localTreasures[0]) { localTreasures[0] = myTreasure; promptLocalHide(1); }
      }
    }

    // hot-seat: lưu 2 kho báu
    const localTreasures = [null, null];
    function promptLocalHide(seat) {
      myTreasure = null;
      phase = "hide";
      renderMine();
      controls.classList.remove("tr-hidden");
      confirmBtn.disabled = true;
      info.textContent = `Người chơi ${seat + 1}: bấm vào LƯỚI CỦA BẠN để giấu kho báu.`;
      // ghi đè handler ready cho người 2
      confirmBtn.onclick = () => {
        if (!myTreasure) return;
        localTreasures[seat] = myTreasure;
        beginPlay();
      };
    }

    function beginPlay() {
      phase = "play";
      controls.classList.add("tr-hidden");
      turn = 0;
      ctx.setTurn(0);
      renderAll();
      updateStatus();
    }

    // ----- đào -----
    function dig(r, c) {
      if (ctx.isOnline) {
        awaiting = true;
        ctx.sendMove({ kind: "dig", r, c });
        info.textContent = "Đang đào, chờ kết quả...";
      } else {
        // chung máy: chấm trên kho báu của đối thủ
        const target = localTreasures[1 - turn];
        const d = dist({ r, c }, target);
        applyDigResult(r, c, d, d === 0);
      }
    }

    function applyDigResult(r, c, d, found) {
      myDigs[r + "," + c] = d;
      const h = hintFor(d);
      ctx.sound(found ? "capture" : (d <= 2 ? "shot" : "miss"));
      renderOpp();
      if (found) return endGame(turn, "đào trúng kho báu");
      // chuyển lượt
      turn = 1 - turn;
      awaiting = false;
      ctx.setTurn(turn);
      renderAll();
      ctx.setStatus(`${h.t} (cách ${d} ô). Lượt Người chơi ${turn + 1}.`);
    }

    // ----- online message -----
    function applyMove(move, fromRemote) {
      if (!fromRemote) return;
      if (move.kind === "ready") {
        oppReady = true;
        if (iReady) beginPlay();
        else info.textContent = "Đối thủ đã sẵn sàng. Hãy giấu kho báu và bấm Sẵn sàng.";
        return;
      }
      if (move.kind === "dig") {
        // đối thủ đào lưới của TÔI -> tôi chấm khoảng cách
        const d = dist({ r: move.r, c: move.c }, myTreasure);
        const found = d === 0;
        oppDigsOnMe[move.r + "," + move.c] = d;
        ctx.sendMove({ kind: "result", r: move.r, c: move.c, dist: d, found });
        renderMine();
        if (found) { endGame(1 - ctx.mySeat, "kho báu của bạn đã bị tìm thấy"); return; }
        turn = ctx.mySeat;
        ctx.setTurn(turn);
        renderAll();
        updateStatus();
        return;
      }
      if (move.kind === "result") {
        // kết quả lần đào của TÔI
        applyDigResult(move.r, move.c, move.dist, move.found);
        return;
      }
    }

    function endGame(winnerSeat, reason) {
      phase = "over";
      ctx.setTurn(-1);
      if (ctx.isOnline) {
        if (winnerSeat === ctx.mySeat) { ctx.incScore(ctx.mySeat); ctx.setStatus(`🎉 Bạn thắng — ${reason}!`); }
        else ctx.setStatus(`💀 Bạn thua — ${reason}.`);
      } else {
        ctx.incScore(winnerSeat);
        ctx.setStatus(`🎉 Người chơi ${winnerSeat + 1} thắng — ${reason}!`);
      }
      renderAll();
    }

    function renderMine() {
      myWrap.cells.forEach((cell, i) => {
        const r = Math.floor(i / N), c = i % N;
        cell.className = "tr-cell";
        cell.textContent = "";
        if (myTreasure && myTreasure.r === r && myTreasure.c === c) {
          cell.classList.add("treasure");
          cell.textContent = "💎";
        }
        const dug = oppDigsOnMe[r + "," + c];
        if (dug !== undefined) {
          cell.classList.add("dug");
          if (dug === 0) { cell.classList.add("hit"); cell.textContent = "💎"; }
          else cell.textContent = dug;
        }
      });
    }

    function renderOpp() {
      oppWrap.cells.forEach((cell, i) => {
        const r = Math.floor(i / N), c = i % N;
        cell.className = "tr-cell";
        cell.textContent = "";
        const d = myDigs[r + "," + c];
        if (d !== undefined) {
          const h = hintFor(d);
          cell.classList.add("dug", h.cls);
          cell.textContent = d === 0 ? "💎" : d;
        }
      });
      const myMove = phase === "play" && (!ctx.isOnline || turn === ctx.mySeat) && !awaiting;
      oppWrap.wrap.classList.toggle("tr-active", myMove);
    }

    function renderAll() { renderMine(); renderOpp(); }

    function updateStatus() {
      if (phase !== "play") return;
      const mine = !ctx.isOnline || turn === ctx.mySeat;
      ctx.setStatus(mine ? "🔍 Lượt bạn — đào một ô trên lưới đối thủ!" : "⏳ Đối thủ đang đào...");
    }

    // ----- khởi tạo -----
    if (ctx.isOnline) {
      info.textContent = "Bấm vào LƯỚI CỦA BẠN (bên trái) để giấu kho báu 💎, rồi bấm Sẵn sàng.";
    } else {
      info.textContent = "Người chơi 1: bấm vào LƯỚI CỦA BẠN (bên trái) để giấu kho báu 💎.";
    }
    ctx.setStatus("Giấu kho báu để bắt đầu.");
    renderAll();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "treasure",
    name: "Trộm Kho Báu",
    emoji: "💎",
    description: "Giấu kho báu trên lưới, đào tìm kho báu đối thủ theo gợi ý nóng/lạnh. Ai tìm thấy trước thì thắng.",
    onlineReady: true,
    options: [
      {
        id: "size", label: "Kích thước lưới", default: 7,
        choices: [
          { value: 5, label: "5×5 (nhanh)" },
          { value: 7, label: "7×7 (chuẩn)" },
          { value: 9, label: "9×9 (khó)" },
        ],
      },
    ],
    howTo: [
      "Đầu ván: mỗi người bấm vào LƯỚI CỦA MÌNH (bên trái) để giấu một kho báu 💎, rồi bấm 'Sẵn sàng'.",
      "Khi cả hai xong, thay nhau ĐÀO một ô trên 'Lưới đối thủ' (bên phải).",
      "Mỗi lần đào nhận gợi ý khoảng cách tới kho báu: 🎯 trúng, 🔥 cực nóng, ♨️ nóng, 🌤️ ấm, ❄️ lạnh — kèm số ô cách.",
      "Ô đã đào hiện con số = khoảng cách (kiểu Manhattan) tới kho báu, dùng để suy ra vị trí.",
      "Ai đào trúng kho báu của đối thủ (khoảng cách 0) trước sẽ thắng.",
    ],
    create,
  });
})();
