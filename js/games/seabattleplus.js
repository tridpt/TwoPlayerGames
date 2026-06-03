/* Sea Battle Plus - online-only Battleship variant with radar, mines, and special ships. */
(function () {
  const N = 10;
  const FLEET = [
    {
      key: "carrier",
      name: "Soái hạm",
      size: 5,
      icon: "CV",
      note: "Nếu bị đánh chìm, bạn mất toàn bộ torpedo còn lại.",
    },
    {
      key: "battleship",
      name: "Thiết giáp hạm",
      size: 4,
      icon: "BB",
      armor: 1,
      note: "Có 1 lớp giáp, cần bắn lại ô đó để phá giáp.",
    },
    {
      key: "submarine",
      name: "Tàu ngầm",
      size: 3,
      icon: "SS",
      stealth: true,
      note: "Không hiện trong kết quả radar 3x3, trừ khi radar ngay đúng tâm.",
    },
    {
      key: "minelayer",
      name: "Tàu rải mìn",
      size: 3,
      icon: "ML",
      note: "Vùng biển của bạn có các ô mìn ẩn.",
    },
    {
      key: "scout",
      name: "Tàu trinh sát",
      size: 2,
      icon: "SC",
      note: "Nếu bị đánh chìm, bạn mất radar còn lại.",
    },
  ];

  function create(ctx) {
    const opts = ctx.options || {};
    const mineCount = opts.mines || 5;
    const startRadar = opts.radar || 3;
    const startTorpedo = opts.torpedo || 2;

    let phase = "placing";
    let iReady = false;
    let oppReady = false;
    let turn = 0;
    let awaiting = false;
    let selectedAction = "shot";
    let torpedoDir = "h";
    let radarCharges = startRadar;
    let torpedoCharges = startTorpedo;
    let mySkipNext = false;
    let lastInfo = "";

    let myBoard = matrix(null);
    let mineBoard = matrix(false);
    let mineTriggered = matrix(false);
    let ships = [];
    let oppShotsOnMe = matrix(0);
    let myShots = matrix(0);
    let radarHints = matrix(null);
    const oppRadarOnMe = [];

    function matrix(v) {
      return Array.from({ length: N }, () => Array(N).fill(v));
    }

    function keyOf(r, c) {
      return r + "," + c;
    }

    function inside(r, c) {
      return r >= 0 && r < N && c >= 0 && c < N;
    }

    function canAttackStatus(status) {
      return status === 0 || status === "armor";
    }

    function isMyTurn() {
      return phase === "playing" && turn === ctx.mySeat && !awaiting;
    }

    const root = document.createElement("div");
    root.className = "sbx-root";
    ctx.boardEl.appendChild(root);

    const setupBar = document.createElement("div");
    setupBar.className = "sbx-setup";
    const shuffleBtn = document.createElement("button");
    shuffleBtn.className = "btn";
    shuffleBtn.textContent = "Xếp lại hạm đội";
    const readyBtn = document.createElement("button");
    readyBtn.className = "btn primary";
    readyBtn.textContent = "Sẵn sàng";
    setupBar.appendChild(shuffleBtn);
    setupBar.appendChild(readyBtn);
    root.appendChild(setupBar);

    const actionBar = document.createElement("div");
    actionBar.className = "sbx-actions sbx-hidden";
    const shotBtn = makeActionButton("Bắn", "shot");
    const radarBtn = makeActionButton("Radar", "radar");
    const torpedoBtn = makeActionButton("Torpedo", "torpedo");
    const dirBtn = document.createElement("button");
    dirBtn.className = "btn small";
    dirBtn.textContent = "Hướng: ngang";
    actionBar.appendChild(shotBtn);
    actionBar.appendChild(radarBtn);
    actionBar.appendChild(torpedoBtn);
    actionBar.appendChild(dirBtn);
    root.appendChild(actionBar);

    const infoPanel = document.createElement("div");
    infoPanel.className = "sbx-info";
    root.appendChild(infoPanel);

    const boards = document.createElement("div");
    boards.className = "sbx-boards";
    root.appendChild(boards);

    const myWrap = makeBoard("Biển của bạn", "Tàu, mìn và các phát bắn của đối thủ");
    const oppWrap = makeBoard("Biển đối thủ", "Bắn, quét radar và kích hoạt kỹ năng");
    boards.appendChild(myWrap.wrap);
    boards.appendChild(oppWrap.wrap);

    function makeActionButton(label, action) {
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        selectedAction = action;
        updateActionButtons();
        updateStatus();
      });
      return btn;
    }

    function makeBoard(title, sub) {
      const wrap = document.createElement("div");
      wrap.className = "sbx-board-wrap";
      const heading = document.createElement("div");
      heading.className = "sbx-board-title";
      heading.innerHTML = `<strong>${title}</strong><span>${sub}</span>`;
      const grid = document.createElement("div");
      grid.className = "sbx-grid";
      const cells = Array.from({ length: N }, () => Array(N));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "sbx-cell";
          cell.dataset.r = String(r);
          cell.dataset.c = String(c);
          grid.appendChild(cell);
          cells[r][c] = cell;
        }
      }
      wrap.appendChild(heading);
      wrap.appendChild(grid);
      return { wrap, grid, cells };
    }

    function placeRandom() {
      myBoard = matrix(null);
      mineBoard = matrix(false);
      mineTriggered = matrix(false);
      oppShotsOnMe = matrix(0);
      myShots = matrix(0);
      radarHints = matrix(null);
      oppRadarOnMe.length = 0;
      ships = [];

      FLEET.forEach((tpl, id) => {
        let placed = false;
        let guard = 0;
        while (!placed && guard++ < 1000) {
          const horiz = Math.random() < 0.5;
          const r = Math.floor(Math.random() * N);
          const c = Math.floor(Math.random() * N);
          const cells = [];
          for (let k = 0; k < tpl.size; k++) {
            const rr = horiz ? r : r + k;
            const cc = horiz ? c + k : c;
            if (!inside(rr, cc) || myBoard[rr][cc] !== null) {
              cells.length = 0;
              break;
            }
            cells.push([rr, cc]);
          }
          if (cells.length === tpl.size) {
            cells.forEach(([rr, cc]) => {
              myBoard[rr][cc] = id;
            });
            ships[id] = {
              id,
              key: tpl.key,
              name: tpl.name,
              size: tpl.size,
              icon: tpl.icon,
              note: tpl.note,
              armor: tpl.armor || 0,
              stealth: !!tpl.stealth,
              cells,
              hits: new Set(),
              sunk: false,
            };
            placed = true;
          }
        }
      });

      let placedMines = 0;
      let guard = 0;
      while (placedMines < mineCount && guard++ < 2000) {
        const r = Math.floor(Math.random() * N);
        const c = Math.floor(Math.random() * N);
        if (myBoard[r][c] !== null || mineBoard[r][c]) continue;
        mineBoard[r][c] = true;
        placedMines++;
      }
    }

    shuffleBtn.addEventListener("click", () => {
      if (phase !== "placing" || iReady) return;
      placeRandom();
      lastInfo = "Đã xếp lại hạm đội và bãi mìn.";
      render();
    });

    readyBtn.addEventListener("click", () => {
      if (phase !== "placing" || iReady) return;
      iReady = true;
      shuffleBtn.disabled = true;
      readyBtn.disabled = true;
      readyBtn.textContent = "Đã sẵn sàng";
      ctx.sendMove({ kind: "ready" });
      if (oppReady) beginPlay();
      else ctx.setStatus("Đã sẵn sàng. Đang chờ đối thủ xếp hạm đội...");
      render();
    });

    dirBtn.addEventListener("click", () => {
      torpedoDir = torpedoDir === "h" ? "v" : "h";
      dirBtn.textContent = torpedoDir === "h" ? "Hướng: ngang" : "Hướng: dọc";
      updateStatus();
    });

    oppWrap.grid.addEventListener("click", (e) => {
      if (!isMyTurn()) return;
      const cell = e.target.closest(".sbx-cell");
      if (!cell) return;
      const r = Number(cell.dataset.r);
      const c = Number(cell.dataset.c);
      takeLocalAction(r, c);
    });

    function beginPlay() {
      phase = "playing";
      turn = 0;
      setupBar.classList.add("sbx-hidden");
      actionBar.classList.remove("sbx-hidden");
      selectedAction = "shot";
      ctx.setTurn(turn);
      lastInfo = "Hai bên đã sẵn sàng. Hãy dùng radar để dò tìm, rồi bắn hoặc phóng torpedo.";
      render();
      updateStatus();
    }

    function takeLocalAction(r, c) {
      if (selectedAction === "radar") {
        if (radarCharges <= 0) {
          ctx.setStatus("Radar da het luot.");
          return;
        }
        radarCharges--;
        awaiting = true;
        radarHints[r][c] = { pending: true };
        ctx.sendMove({ kind: "radar", r, c });
        lastInfo = `Đang quét radar tại ${coord(r, c)}...`;
        render();
        updateStatus();
        return;
      }

      const targets = selectedAction === "torpedo" ? torpedoTargets(r, c) : [[r, c]];
      const usable = targets.filter(([rr, cc]) => canAttackStatus(myShots[rr][cc]));
      if (!usable.length) {
        ctx.setStatus("Khu vực này đã bị bắn/quét hết mục tiêu có thể tấn công.");
        return;
      }
      if (selectedAction === "torpedo") {
        if (torpedoCharges <= 0) {
          ctx.setStatus("Torpedo đã hết.");
          return;
        }
        torpedoCharges--;
      }

      awaiting = true;
      usable.forEach(([rr, cc]) => {
        myShots[rr][cc] = "pending";
      });
      ctx.sendMove({ kind: "attack", action: selectedAction, cells: usable.map(([rr, cc]) => ({ r: rr, c: cc })) });
      lastInfo = selectedAction === "torpedo"
        ? `Đã phóng torpedo vào ${usable.map(([rr, cc]) => coord(rr, cc)).join(", ")}.`
        : `Đã bắn vào ${coord(r, c)}.`;
      render();
      updateStatus();
    }

    function torpedoTargets(r, c) {
      const raw = torpedoDir === "h"
        ? [[r, c - 1], [r, c], [r, c + 1]]
        : [[r - 1, c], [r, c], [r + 1, c]];
      return raw.filter(([rr, cc]) => inside(rr, cc));
    }

    function applyMove(move, fromRemote) {
      if (!fromRemote) return;
      if (move.kind === "ready") {
        oppReady = true;
        if (iReady) beginPlay();
        else ctx.setStatus("Đối thủ đã sẵn sàng. Xếp hạm đội rồi bấm Sẵn sàng.");
        render();
        return;
      }

      if (move.kind === "attack") {
        const extraTurn = mySkipNext;
        mySkipNext = false;
        const result = resolveIncomingAttack(move);
        result.extraTurn = extraTurn && !result.gameOver;
        ctx.sendMove({ kind: "attackResult", ...result });

        if (result.gameOver) {
          render();
          endGame(false);
          return;
        }

        turn = result.extraTurn ? 1 - ctx.mySeat : ctx.mySeat;
        ctx.setTurn(turn);
        lastInfo = result.extraTurn
          ? "Bạn đang bị phạt bỏ lượt do dính mìn, đối thủ được đi tiếp."
          : describeEnemyAttack(result);
        render();
        updateStatus();
        return;
      }

      if (move.kind === "attackResult") {
        awaiting = false;
        applyAttackResult(move);
        if (move.trap) mySkipNext = true;
        if (move.gameOver) {
          render();
          endGame(true);
          return;
        }

        turn = move.extraTurn ? ctx.mySeat : 1 - ctx.mySeat;
        ctx.setTurn(turn);
        lastInfo = describeMyAttack(move);
        render();
        updateStatus();
        return;
      }

      if (move.kind === "radar") {
        const extraTurn = mySkipNext;
        mySkipNext = false;
        const scan = resolveRadar(move.r, move.c);
        scan.extraTurn = extraTurn;
        oppRadarOnMe.push({ r: move.r, c: move.c });
        ctx.sendMove({ kind: "radarResult", ...scan });
        turn = scan.extraTurn ? 1 - ctx.mySeat : ctx.mySeat;
        ctx.setTurn(turn);
        lastInfo = scan.extraTurn
          ? "Bạn đang bị phạt bỏ lượt do dính mìn, đối thủ được đi tiếp."
          : `Đối thủ vừa quét radar tại ${coord(move.r, move.c)}.`;
        render();
        updateStatus();
        return;
      }

      if (move.kind === "radarResult") {
        awaiting = false;
        radarHints[move.r][move.c] = {
          shipCount: move.shipCount,
          mineCount: move.mineCount,
          stealthPing: move.stealthPing,
        };
        turn = move.extraTurn ? ctx.mySeat : 1 - ctx.mySeat;
        ctx.setTurn(turn);
        lastInfo = `Radar ${coord(move.r, move.c)}: ${move.shipCount} ô tàu, ${move.mineCount} mìn`
          + (move.stealthPing ? ", có tín hiệu tàu ngầm ngay tâm." : ".");
        render();
        updateStatus();
      }
    }

    function resolveIncomingAttack(move) {
      const cells = move.cells.map(({ r, c }) => resolveCellAttack(r, c));
      const trap = cells.some((cell) => cell.mine);
      const gameOver = ships.every((ship) => ship.sunk);
      if (trap) ctx.sound("miss");
      else if (cells.some((cell) => cell.hit || cell.armor)) ctx.sound("shot");
      else ctx.sound("miss");
      return {
        action: move.action,
        cells,
        trap,
        gameOver,
      };
    }

    function resolveCellAttack(r, c) {
      if (!inside(r, c)) return { r, c, repeat: true };

      const prior = oppShotsOnMe[r][c];
      if (prior && prior !== "armor") {
        return { r, c, repeat: true };
      }

      if (mineBoard[r][c] && !mineTriggered[r][c]) {
        mineTriggered[r][c] = true;
        oppShotsOnMe[r][c] = "mine";
        return { r, c, hit: false, mine: true };
      }

      const shipId = myBoard[r][c];
      if (shipId === null) {
        oppShotsOnMe[r][c] = "miss";
        return { r, c, hit: false };
      }

      const ship = ships[shipId];
      const cellKey = keyOf(r, c);
      if (ship.armor > 0 && !ship.hits.has(cellKey)) {
        ship.armor--;
        oppShotsOnMe[r][c] = "armor";
        return { r, c, hit: false, armor: true, shipName: ship.name };
      }

      ship.hits.add(cellKey);
      oppShotsOnMe[r][c] = "hit";
      const sunk = ship.hits.size >= ship.size;
      if (sunk && !ship.sunk) {
        ship.sunk = true;
        if (ship.key === "scout") {
          radarCharges = 0;
          if (selectedAction === "radar") selectedAction = "shot";
        }
        if (ship.key === "carrier") {
          torpedoCharges = 0;
          if (selectedAction === "torpedo") selectedAction = "shot";
        }
        return {
          r,
          c,
          hit: true,
          sunk: true,
          shipName: ship.name,
          shipKey: ship.key,
          sunkCells: ship.cells,
        };
      }

      return { r, c, hit: true, shipName: ship.name, shipKey: ship.key };
    }

    function resolveRadar(r, c) {
      let shipCount = 0;
      let mineCount = 0;
      let stealthPing = false;
      for (let rr = r - 1; rr <= r + 1; rr++) {
        for (let cc = c - 1; cc <= c + 1; cc++) {
          if (!inside(rr, cc)) continue;
          if (mineBoard[rr][cc] && !mineTriggered[rr][cc]) mineCount++;
          const shipId = myBoard[rr][cc];
          if (shipId === null) continue;
          const ship = ships[shipId];
          if (ship.stealth) {
            if (rr === r && cc === c) stealthPing = true;
          } else {
            shipCount++;
          }
        }
      }
      return { r, c, shipCount, mineCount, stealthPing };
    }

    function applyAttackResult(result) {
      result.cells.forEach((cell) => {
        if (cell.repeat) return;
        if (cell.mine) myShots[cell.r][cell.c] = "mine";
        else if (cell.armor) myShots[cell.r][cell.c] = "armor";
        else if (cell.hit) myShots[cell.r][cell.c] = "hit";
        else myShots[cell.r][cell.c] = "miss";
        if (cell.sunk && cell.sunkCells) {
          cell.sunkCells.forEach(([rr, cc]) => {
            myShots[rr][cc] = "sunk";
          });
        }
      });
      if (result.cells.some((cell) => cell.hit || cell.armor)) ctx.sound("shot");
      else ctx.sound("miss");
    }

    function describeEnemyAttack(result) {
      const hits = result.cells.filter((cell) => cell.hit).length;
      const armor = result.cells.some((cell) => cell.armor);
      const mines = result.cells.some((cell) => cell.mine);
      const sunk = result.cells.find((cell) => cell.sunk);
      if (sunk) return `Đối thủ đã đánh chìm ${sunk.shipName} của bạn.`;
      if (armor) return "Đối thủ bắn trúng lớp giáp của thiết giáp hạm.";
      if (hits) return `Đối thủ bắn trúng ${hits} ô tàu của bạn.`;
      if (mines) return "Đối thủ đã kích hoạt mìn của bạn và sẽ bị phạt bỏ lượt.";
      return "Đối thủ bắn trượt.";
    }

    function describeMyAttack(result) {
      const sunk = result.cells.find((cell) => cell.sunk);
      const armor = result.cells.some((cell) => cell.armor);
      const hits = result.cells.filter((cell) => cell.hit).length;
      const mines = result.cells.some((cell) => cell.mine);
      let text;
      if (sunk) text = `Đánh chìm ${sunk.shipName}!`;
      else if (armor) text = "Bạn trúng lớp giáp. Ô này cần bắn lại để phá giáp.";
      else if (hits) text = `Bạn trúng ${hits} ô tàu.`;
      else if (mines) text = "Bạn dính mìn ẩn. Sau lượt đối thủ, bạn sẽ bị bỏ lượt.";
      else text = "Bạn trượt.";
      if (result.extraTurn) text += " Đối thủ đang bị phạt bỏ lượt, bạn được đi tiếp.";
      return text;
    }

    function endGame(iWon) {
      phase = "over";
      awaiting = false;
      ctx.setTurn(-1);
      if (iWon) {
        ctx.incScore(ctx.mySeat);
        ctx.setStatus("🎉 Bạn thắng - đã đánh chìm toàn bộ hạm đội đặc biệt của đối thủ!");
      } else {
        ctx.incScore(1 - ctx.mySeat);
        ctx.setStatus("💀 Bạn thua - hạm đội đặc biệt của bạn đã bị đánh chìm.");
      }
      render();
    }

    function updateActionButtons() {
      shotBtn.classList.toggle("active", selectedAction === "shot");
      radarBtn.classList.toggle("active", selectedAction === "radar");
      torpedoBtn.classList.toggle("active", selectedAction === "torpedo");
      radarBtn.textContent = `Radar (${radarCharges})`;
      torpedoBtn.textContent = `Torpedo (${torpedoCharges})`;
      radarBtn.disabled = phase !== "playing" || radarCharges <= 0;
      torpedoBtn.disabled = phase !== "playing" || torpedoCharges <= 0;
      dirBtn.disabled = phase !== "playing" || selectedAction !== "torpedo";
    }

    function render() {
      renderMyBoard();
      renderEnemyBoard();
      renderInfo();
      updateActionButtons();
      const active = isMyTurn();
      oppWrap.wrap.classList.toggle("sbx-active", active);
    }

    function renderMyBoard() {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = myWrap.cells[r][c];
          cell.className = "sbx-cell";
          cell.textContent = "";
          const shipId = myBoard[r][c];
          if (shipId !== null) {
            const ship = ships[shipId];
            cell.classList.add("ship", ship.key);
            cell.textContent = ship.icon;
          }
          if (mineBoard[r][c]) {
            cell.classList.add("mine");
            if (shipId === null) cell.textContent = mineTriggered[r][c] ? "!" : "M";
          }
          const scan = oppRadarOnMe.some((p) => Math.abs(p.r - r) <= 1 && Math.abs(p.c - c) <= 1);
          if (scan) cell.classList.add("scanned");
          const shot = oppShotsOnMe[r][c];
          if (shot === "hit") cell.classList.add("hit");
          else if (shot === "armor") cell.classList.add("armor");
          else if (shot === "miss") cell.classList.add("miss");
          else if (shot === "mine") cell.classList.add("mine-hit");
        }
      }
    }

    function renderEnemyBoard() {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = oppWrap.cells[r][c];
          cell.className = "sbx-cell";
          cell.textContent = "";
          const shot = myShots[r][c];
          if (shot === "pending") cell.classList.add("pending");
          else if (shot === "hit") cell.classList.add("hit");
          else if (shot === "sunk") cell.classList.add("hit", "sunk");
          else if (shot === "armor") {
            cell.classList.add("armor");
            cell.textContent = "G";
          } else if (shot === "miss") cell.classList.add("miss");
          else if (shot === "mine") {
            cell.classList.add("mine-hit");
            cell.textContent = "M";
          }

          const hint = radarHints[r][c];
          if (hint) {
            cell.classList.add("radar");
            if (hint.pending) cell.textContent = "...";
            else if (!cell.textContent) {
              cell.textContent = hint.stealthPing ? "S" : String(hint.shipCount);
              cell.title = `Tàu: ${hint.shipCount}, mìn: ${hint.mineCount}`
                + (hint.stealthPing ? ", tàu ngầm ngay tâm" : "");
            }
          }
        }
      }
    }

    function renderInfo() {
      const mineLeft = countMinesLeft();
      const fleetHtml = ships.map((ship) => {
        const hits = ship.hits.size;
        const armor = ship.armor > 0 ? ` + giáp:${ship.armor}` : "";
        const status = ship.sunk ? "chìm" : `${hits}/${ship.size}${armor}`;
        return `<li class="${ship.sunk ? "sunk" : ""}">
          <span class="sbx-ship-code">${ship.icon}</span>
          <span>${ship.name}</span>
          <b>${status}</b>
        </li>`;
      }).join("");

      infoPanel.innerHTML = `
        <div class="sbx-resource">
          <span>Radar: <b>${radarCharges}</b></span>
          <span>Torpedo: <b>${torpedoCharges}</b></span>
          <span>Mìn còn ẩn: <b>${mineLeft}</b></span>
          <span>${mySkipNext ? "Đang bị phạt bỏ lượt" : "Sẵn sàng chiến đấu"}</span>
        </div>
        <ul class="sbx-fleet">${fleetHtml}</ul>
        <div class="sbx-last">${lastInfo || "Xếp hạm đội, kiểm tra mìn, rồi bấm Sẵn sàng."}</div>
      `;
    }

    function countMinesLeft() {
      let count = 0;
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++)
          if (mineBoard[r][c] && !mineTriggered[r][c]) count++;
      return count;
    }

    function updateStatus() {
      if (phase !== "playing") return;
      if (awaiting) {
        ctx.setStatus("Đang chờ đối thủ trả kết quả...");
        return;
      }
      if (turn !== ctx.mySeat) {
        ctx.setStatus("Đối thủ đang hành động. Chuẩn bị phòng thủ.");
        return;
      }
      if (selectedAction === "radar") {
        ctx.setStatus("Lượt bạn - chọn một ô trên biển đối thủ để quét radar 3x3.");
      } else if (selectedAction === "torpedo") {
        ctx.setStatus(`Lượt bạn - torpedo sẽ đánh 3 ô theo hướng ${torpedoDir === "h" ? "ngang" : "dọc"}.`);
      } else {
        ctx.setStatus("Lượt bạn - chọn một ô trên biển đối thủ để bắn.");
      }
    }

    function coord(r, c) {
      return String.fromCharCode(65 + c) + (r + 1);
    }

    if (!ctx.isOnline) {
      ctx.setStatus("Sea Battle Nâng Cấp chỉ chơi online vì cần giữ bí mật hạm đội và mìn.");
      return { applyMove: () => {} };
    }

    placeRandom();
    render();
    ctx.setStatus("Kiểm tra hạm đội và mìn của bạn. Bấm Xếp lại nếu muốn đổi vị trí, rồi bấm Sẵn sàng.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "seabattleplus",
    name: "Sea Battle Nâng Cấp",
    emoji: "🌊",
    description: "Battleship online có radar 3x3, mìn ẩn, torpedo và các tàu đặc biệt như tàu ngầm, trinh sát, thiết giáp.",
    onlineReady: true,
    localReady: false,
    options: [
      {
        id: "mines",
        label: "Số mìn ẩn",
        default: 5,
        choices: [
          { value: 3, label: "3 mìn" },
          { value: 5, label: "5 mìn" },
          { value: 7, label: "7 mìn" },
        ],
      },
      {
        id: "radar",
        label: "Lượt radar",
        default: 3,
        choices: [
          { value: 2, label: "2 lượt" },
          { value: 3, label: "3 lượt" },
          { value: 4, label: "4 lượt" },
        ],
      },
      {
        id: "torpedo",
        label: "Torpedo",
        default: 2,
        choices: [
          { value: 1, label: "1 quả" },
          { value: 2, label: "2 quả" },
          { value: 3, label: "3 quả" },
        ],
      },
    ],
    howTo: [
      "Game chỉ chơi online vì mỗi người có hạm đội và bãi mìn riêng cần giữ bí mật.",
      "Đầu ván hệ thống tự xếp 5 tàu đặc biệt và mìn ẩn trên biển của bạn. Có thể bấm Xếp lại trước khi Sẵn sàng.",
      "Bắn thường tấn công 1 ô. Torpedo tấn công tối đa 3 ô theo hàng ngang hoặc dọc.",
      "Radar quét vùng 3x3, trả về số ô tàu thường và số mìn trong vùng. Tàu ngầm không bị radar đếm, trừ khi radar đặt đúng tâm tàu ngầm.",
      "Nếu bắn trúng mìn ẩn, bạn sẽ bị phạt bỏ lượt kế tiếp sau khi đối thủ hành động.",
      "Thiết giáp hạm có 1 lớp giáp: lần đầu bắn trúng chỉ phá giáp, cần bắn lại ô đó để gây sát thương.",
      "Nếu tàu trinh sát của bạn bị đánh chìm, bạn mất radar còn lại. Nếu soái hạm bị đánh chìm, bạn mất torpedo còn lại.",
      "Ai đánh chìm toàn bộ hạm đội đặc biệt của đối thủ trước sẽ thắng.",
    ],
    create,
  });
})();
