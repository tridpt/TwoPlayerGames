/* Trap Mansion - biet thu an phong, bay bi mat giua hai nguoi choi online. */
(function () {
  const ROOM_SIZE = 74;
  const GAP = 9;
  const PAD = 20;
  const HUD_H = 28;
  const TYPES = {
    start: { label: "Sảnh vào", icon: "🚪", color: "#4dd0e1" },
    vault: { label: "Kho trung tâm", icon: "🏆", color: "#ffd166" },
    seal: { label: "Ấn cổ", icon: "📜", color: "#c9a8ff" },
    med: { label: "Phòng y tế", icon: "💊", color: "#6ee7b7" },
    kit: { label: "Kho dụng cụ", icon: "🧰", color: "#ffd166" },
    map: { label: "Phòng bản đồ", icon: "🗺️", color: "#8be6f0" },
    curse: { label: "Phòng nguyền", icon: "☠️", color: "#ff5d73" },
    empty: { label: "Phòng trống", icon: "·", color: "#9aa0d0" },
  };
  const TRAPS = {
    snare: { label: "Dây khóa", icon: "🪤", damage: 6, stun: 1 },
    spike: { label: "Gai sàn", icon: "🔺", damage: 14, stun: 0 },
    alarm: { label: "Chuông báo", icon: "🔔", damage: 4, stun: 1 },
  };

  function create(ctx) {
    const o = ctx.options || {};
    const N = o.size || 5;
    const GOAL = o.goal || 3;
    const START_TRAPS = o.traps || 3;
    const MAX_HP = o.hp || 60;
    const W = PAD * 2 + N * ROOM_SIZE + (N - 1) * GAP;
    const H = PAD * 2 + HUD_H + N * ROOM_SIZE + (N - 1) * GAP;
    const vault = { r: Math.floor(N / 2), c: Math.floor(N / 2) };
    const starts = [
      { r: N - 1, c: 0 },
      { r: 0, c: N - 1 },
    ];

    const rooms = makeRooms();
    const players = [
      { r: starts[0].r, c: starts[0].c, hp: MAX_HP, seals: 0, kits: 1, scans: 2, stun: 0 },
      { r: starts[1].r, c: starts[1].c, hp: MAX_HP, seals: 0, kits: 1, scans: 2, stun: 0 },
    ];
    const discovered = [new Set([key(starts[0].r, starts[0].c)]), new Set([key(starts[1].r, starts[1].c)])];
    const searched = [new Set(), new Set()];
    const knownDanger = [Object.create(null), Object.create(null)];
    const myTraps = ctx.isOnline ? makeMyTraps() : [];
    const revealedTraps = [];
    const log = ["Hai nhà thám hiểm bước vào biệt thự. Không ai thấy bẫy của đối thủ."];
    let turn = 0;
    let mode = "move";
    let awaiting = false;
    let over = false;
    let selectedRoom = null;
    let hoverRoom = null;
    let pulse = 0;
    let rafId = null;

    const root = document.createElement("div");
    root.className = "tm-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "tm-hud";
    root.appendChild(hud);

    const stageWrap = document.createElement("div");
    stageWrap.className = "tm-stage-wrap";
    const canvas = document.createElement("canvas");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.className = "tm-canvas";
    stageWrap.appendChild(canvas);
    root.appendChild(stageWrap);
    const g = canvas.getContext("2d");
    g.scale(DPR, DPR);

    const legend = document.createElement("div");
    legend.className = "tm-legend";
    legend.innerHTML = [
      ["🏆", "Kho trung tâm"],
      ["📜", "Ấn cổ"],
      ["💊", "Hồi máu"],
      ["🧰", "Thêm bẫy"],
      ["🗺️", "Thêm quét"],
      ["☠️", "Phòng nguyền"],
      ["🪤", "Bẫy của bạn"],
      ["❓", "Chưa khám phá"],
    ].map(([i, l]) => `<span><b>${i}</b>${l}</span>`).join("");
    root.appendChild(legend);

    const actions = document.createElement("div");
    actions.className = "tm-actions";
    root.appendChild(actions);

    const info = document.createElement("div");
    info.className = "tm-info";
    root.appendChild(info);

    function makeRooms() {
      const grid = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ type: "empty" })));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (same(r, c, starts[0]) || same(r, c, starts[1]) || same(r, c, vault)) continue;
          const roll = ctx.rng();
          let type = "empty";
          if (roll < 0.20) type = "seal";
          else if (roll < 0.34) type = "med";
          else if (roll < 0.48) type = "kit";
          else if (roll < 0.62) type = "map";
          else if (roll < 0.76) type = "curse";
          grid[r][c] = { type };
        }
      }
      grid[starts[0].r][starts[0].c] = { type: "start", owner: 0 };
      grid[starts[1].r][starts[1].c] = { type: "start", owner: 1 };
      grid[vault.r][vault.c] = { type: "vault" };
      ensureSeals(grid);
      return grid;
    }

    function ensureSeals(grid) {
      let count = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c].type === "seal") count++;
      const candidates = [];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (grid[r][c].type === "empty") candidates.push({ r, c });
        }
      }
      while (count < GOAL + 1 && candidates.length) {
        const p = candidates.shift();
        grid[p.r][p.c].type = "seal";
        count++;
      }
    }

    function makeMyTraps() {
      const list = [];
      const blocked = new Set([
        key(starts[0].r, starts[0].c),
        key(starts[1].r, starts[1].c),
        key(vault.r, vault.c),
      ]);
      let guard = 0;
      while (list.length < START_TRAPS && guard < 300) {
        guard++;
        const r = Math.floor(Math.random() * N);
        const c = Math.floor(Math.random() * N);
        const k = key(r, c);
        if (blocked.has(k) || list.some((t) => t.k === k)) continue;
        list.push({ k, r, c, type: randomTrap(), placed: "setup" });
      }
      return list;
    }

    function randomTrap() {
      const roll = Math.random();
      if (roll < 0.38) return "snare";
      if (roll < 0.72) return "spike";
      return "alarm";
    }

    function same(r, c, p) {
      return r === p.r && c === p.c;
    }

    function key(r, c) {
      return `${r},${c}`;
    }

    function parseKey(k) {
      const [r, c] = k.split(",").map(Number);
      return { r, c };
    }

    function roomAt(r, c) {
      return rooms[r]?.[c] || null;
    }

    function canAct(fromRemote) {
      return !over && !awaiting && (fromRemote || !ctx.isOnline || turn === ctx.mySeat);
    }

    function isMyTurn() {
      return ctx.isOnline && turn === ctx.mySeat && !awaiting && !over;
    }

    function actor(side) {
      return players[side];
    }

    function legalStep(side, r, c) {
      const p = actor(side);
      return inside(r, c) && Math.abs(p.r - r) + Math.abs(p.c - c) === 1;
    }

    function inside(r, c) {
      return r >= 0 && r < N && c >= 0 && c < N;
    }

    function selectableRoom(r, c) {
      const p = actor(turn);
      if (mode === "move") return legalStep(turn, r, c);
      if (mode === "trap") return p.kits > 0 && (same(r, c, p) || legalStep(turn, r, c)) && canPlaceTrap(r, c);
      if (mode === "scan") return p.scans > 0 && (same(r, c, p) || legalStep(turn, r, c));
      return false;
    }

    function canPlaceTrap(r, c) {
      const k = key(r, c);
      if (same(r, c, starts[0]) || same(r, c, starts[1]) || same(r, c, vault)) return false;
      return !myTraps.some((t) => t.k === k);
    }

    function applyMove(move, fromRemote) {
      if (!move || over) return;
      if (!fromRemote && !canAct(false)) return;
      if (move.t === "move") return handleMove(move, fromRemote);
      if (move.t === "moveResult") return handleMoveResult(move, fromRemote);
      if (move.t === "search") return handleSearch(move, fromRemote);
      if (move.t === "trap") return handleTrap(move, fromRemote);
      if (move.t === "scan") return handleScan(move, fromRemote);
      if (move.t === "scanResult") return handleScanResult(move, fromRemote);
      if (move.t === "recover") return handleRecover(move, fromRemote);
    }

    function handleMove(move, fromRemote) {
      const side = Number(move.side);
      const r = Number(move.r);
      const c = Number(move.c);
      if (!inside(r, c) || !legalStep(side, r, c) || actor(side).stun > 0) return;

      if (!fromRemote) {
        awaiting = true;
        ctx.sendMove({ t: "move", side, r, c });
        addLog("Bạn bước vào hành lang mới, đang chờ xem có bẫy hay không...");
        render();
        updateStatus();
        return;
      }

      const trap = popTrapAt(r, c);
      const result = trap ? trapResult(trap) : { triggered: false };
      ctx.sendMove({ t: "moveResult", side, r, c, ...result });
      resolveMove(side, r, c, result);
    }

    function popTrapAt(r, c) {
      const k = key(r, c);
      const trap = myTraps.find((t) => t.k === k);
      if (!trap) return null;
      myTraps.splice(myTraps.indexOf(trap), 1);
      return trap;
    }

    function trapResult(trap) {
      const def = TRAPS[trap.type] || TRAPS.snare;
      return {
        triggered: true,
        trap: trap.type,
        damage: def.damage,
        stun: def.stun,
      };
    }

    function handleMoveResult(move) {
      awaiting = false;
      const side = Number(move.side);
      resolveMove(side, Number(move.r), Number(move.c), move);
    }

    function resolveMove(side, r, c, result) {
      const p = actor(side);
      p.r = r;
      p.c = c;
      discovered[side].add(key(r, c));
      selectedRoom = null;
      const owner = 1 - side;
      if (result.triggered) {
        const def = TRAPS[result.trap] || TRAPS.snare;
        p.hp = Math.max(0, p.hp - Number(result.damage || def.damage));
        p.stun = Math.max(p.stun, Number(result.stun || def.stun));
        revealedTraps.push({ r, c, owner, type: result.trap || "snare" });
        addLog(`P${side + 1} kích hoạt ${def.label} ở phòng ${labelRoom(r, c)}.`);
        ctx.sound("capture");
      } else {
        addLog(`P${side + 1} bước vào ${labelRoom(r, c)} an toàn.`);
        ctx.sound("place");
      }
      if (p.hp <= 0) return finish(1 - side, `P${side + 1} gục vì bẫy trong biệt thự`);
      if (checkVaultWin(side)) return;
      endTurn();
    }

    function handleSearch(move, fromRemote) {
      const side = Number(move.side);
      const p = actor(side);
      if (!p || searched[side].has(key(p.r, p.c))) return;

      if (!fromRemote) {
        const result = searchResult(side);
        ctx.sendMove({ t: "search", side, ...result });
        applySearch(side, result);
        return;
      }
      applySearch(side, move);
    }

    function searchResult(side) {
      const p = actor(side);
      const room = roomAt(p.r, p.c);
      const type = room.type;
      const result = { room: key(p.r, p.c), type, hp: 0, seals: 0, kits: 0, scans: 0 };
      if (type === "seal") result.seals = 1;
      else if (type === "med") result.hp = 14;
      else if (type === "kit") result.kits = 1;
      else if (type === "map") result.scans = 1;
      else if (type === "curse") result.hp = -10;
      return result;
    }

    function applySearch(side, result) {
      const p = actor(side);
      const roomKey = result.room || key(p.r, p.c);
      searched[side].add(roomKey);
      discovered[side].add(roomKey);
      revealAround(side, roomKey);
      p.hp = Math.min(MAX_HP, Math.max(0, p.hp + Number(result.hp || 0)));
      p.seals += Number(result.seals || 0);
      p.kits += Number(result.kits || 0);
      p.scans += Number(result.scans || 0);
      addLog(searchText(side, result));
      ctx.sound(result.seals ? "capture" : result.hp < 0 ? "miss" : "select");
      if (p.hp <= 0) return finish(1 - side, `P${side + 1} bị căn phòng nguyền hạ gục`);
      if (checkVaultWin(side)) return;
      endTurn();
    }

    function searchText(side, result) {
      const type = result.type || "empty";
      const label = TYPES[type]?.label || "Phòng lạ";
      if (result.seals) return `P${side + 1} lục ${label} và tìm được 1 ấn cổ.`;
      if (result.kits) return `P${side + 1} tìm được bộ bẫy dự phòng.`;
      if (result.scans) return `P${side + 1} tìm thấy bản đồ bụi, thêm 1 lượt quét.`;
      if (result.hp > 0) return `P${side + 1} hồi ${result.hp} HP trong ${label}.`;
      if (result.hp < 0) return `P${side + 1} bị lời nguyền cắn mất ${Math.abs(result.hp)} HP.`;
      return `P${side + 1} lục ${label}, không thấy gì đáng giá.`;
    }

    function revealAround(side, roomKey) {
      const p = parseKey(roomKey);
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const r = p.r + dr;
        const c = p.c + dc;
        if (inside(r, c)) discovered[side].add(key(r, c));
      });
    }

    function handleTrap(move, fromRemote) {
      const side = Number(move.side);
      if (!fromRemote) {
        const r = Number(move.r);
        const c = Number(move.c);
        const p = actor(side);
        if (!selectableRoom(r, c) || p.kits <= 0) return;
        const trap = { r, c, k: key(r, c), type: randomTrap(), placed: "manual" };
        myTraps.push(trap);
        p.kits -= 1;
        ctx.sendMove({ t: "trap", side });
        addLog(`Bạn gài một bẫy bí mật ở ${labelRoom(r, c)}.`);
        ctx.sound("select");
        return endTurn();
      }
      actor(side).kits = Math.max(0, actor(side).kits - 1);
      addLog(`P${side + 1} dừng lại một lúc. Có thể họ vừa gài bẫy.`);
      ctx.sound("select");
      endTurn();
    }

    function handleScan(move, fromRemote) {
      const side = Number(move.side);
      const r = Number(move.r);
      const c = Number(move.c);
      if (!inside(r, c)) return;

      if (!fromRemote) {
        const p = actor(side);
        if (p.scans <= 0 || !(same(r, c, p) || legalStep(side, r, c))) return;
        p.scans -= 1;
        awaiting = true;
        ctx.sendMove({ t: "scan", side, r, c });
        addLog(`Bạn rắc bụi bạc vào ${labelRoom(r, c)}, chờ phản ứng...`);
        render();
        updateStatus();
        return;
      }

      const danger = myTraps.some((t) => t.k === key(r, c));
      ctx.sendMove({ t: "scanResult", side, r, c, danger });
      actor(side).scans = Math.max(0, actor(side).scans - 1);
      addLog(`P${side + 1} quét một căn phòng.`);
      endTurn();
    }

    function handleScanResult(move) {
      awaiting = false;
      const side = Number(move.side);
      const k = key(Number(move.r), Number(move.c));
      knownDanger[side][k] = move.danger ? "danger" : "safe";
      addLog(move.danger
        ? `Bụi bạc đổi màu: ${labelRoom(move.r, move.c)} có dấu bẫy.`
        : `${labelRoom(move.r, move.c)} chưa thấy dấu bẫy.`);
      ctx.sound(move.danger ? "capture" : "select");
      endTurn();
    }

    function handleRecover(move, fromRemote) {
      const side = Number(move.side);
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "recover", side });
      actor(side).stun = 0;
      addLog(`P${side + 1} thoát khỏi cơ chế khóa và đứng dậy.`);
      ctx.sound("select");
      endTurn();
    }

    function checkVaultWin(side) {
      const p = actor(side);
      if (p.seals >= GOAL && same(p.r, p.c, vault)) {
        finish(side, `đã gom đủ ${GOAL} ấn và mở kho trung tâm`);
        return true;
      }
      return false;
    }

    function finish(winner, reason) {
      if (over) return;
      over = true;
      awaiting = false;
      ctx.setTurn(-1);
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng - ${reason}!`);
      render();
    }

    function endTurn() {
      if (over) return;
      selectedRoom = null;
      awaiting = false;
      turn = 1 - turn;
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function addLog(text) {
      log.unshift(text);
      while (log.length > 6) log.pop();
    }

    function labelRoom(r, c) {
      const room = roomAt(Number(r), Number(c));
      return room ? TYPES[room.type]?.label || "Phòng lạ" : "Phòng lạ";
    }

    function setMode(next) {
      if (!isMyTurn()) return;
      mode = next;
      selectedRoom = null;
      render();
      updateStatus();
    }

    function canvasPoint(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * W / rect.width,
        y: (e.clientY - rect.top) * H / rect.height,
      };
    }

    function clickCanvas(e) {
      if (!isMyTurn()) return;
      const p = actor(ctx.mySeat);
      if (p.stun > 0) return;
      const pt = canvasPoint(e);
      const room = findRoomAt(pt.x, pt.y);
      if (!room) return;
      selectedRoom = key(room.r, room.c);
      if (mode === "move") applyMove({ t: "move", side: ctx.mySeat, r: room.r, c: room.c }, false);
      else if (mode === "trap") applyMove({ t: "trap", side: ctx.mySeat, r: room.r, c: room.c }, false);
      else if (mode === "scan") applyMove({ t: "scan", side: ctx.mySeat, r: room.r, c: room.c }, false);
      else render();
    }

    function findRoomAt(x, y) {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const pos = roomPos(r, c);
          if (x >= pos.x && x <= pos.x + ROOM_SIZE && y >= pos.y && y <= pos.y + ROOM_SIZE) return { r, c };
        }
      }
      return null;
    }

    function roomPos(r, c) {
      return {
        x: PAD + c * (ROOM_SIZE + GAP),
        y: PAD + HUD_H + r * (ROOM_SIZE + GAP),
      };
    }

    function render() {
      renderHud();
      renderActions();
      renderInfo();
      draw();
      startPulse();
    }

    function startPulse() {
      if (rafId == null && isMyTurn() && !over) rafId = requestAnimationFrame(animate);
    }

    function animate() {
      if (!document.body.contains(canvas)) { rafId = null; return; }
      pulse = (Math.sin(performance.now() / 360) + 1) / 2;
      if (isMyTurn() && !over) {
        draw();
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
        draw();
      }
    }

    function renderHud() {
      hud.innerHTML = `
        ${playerPanel(0)}
        <div class="tm-mid">
          <b>${over ? "Kết thúc" : awaiting ? "Đang chờ phản hồi" : "Lượt Người chơi " + (turn + 1)}</b>
          <span>Mục tiêu: ${GOAL} ấn cổ rồi vào kho trung tâm</span>
          <small>${log[0] || ""}</small>
        </div>
        ${playerPanel(1)}
      `;
    }

    function playerPanel(side) {
      const p = actor(side);
      const hpPct = Math.max(0, p.hp / MAX_HP * 100);
      return `
        <div class="tm-player p${side + 1} ${turn === side && !over ? "active" : ""}">
          <span>Người chơi ${side + 1}</span>
          <b>${p.hp}/${MAX_HP} HP</b>
          <i class="tm-hp"><i style="width:${hpPct}%"></i></i>
          <small>${p.seals}/${GOAL} ấn · ${p.kits} bẫy · ${p.scans} quét${p.stun ? " · đang kẹt" : ""}</small>
        </div>
      `;
    }

    function renderActions() {
      const p = ctx.isOnline ? actor(ctx.mySeat) : actor(0);
      const disabled = !isMyTurn();
      if (p.stun > 0 && isMyTurn()) {
        actions.innerHTML = `<button class="btn primary tm-command" type="button" data-recover="1">Gỡ cơ chế khóa</button>`;
        actions.querySelector("[data-recover]").addEventListener("click", () => applyMove({ t: "recover", side: ctx.mySeat }, false));
        return;
      }
      const defs = [
        ["move", "🚶", "Di chuyển", "sang phòng kề"],
        ["search", "🔍", "Lục phòng", "lấy ấn/vật phẩm"],
        ["trap", "🪤", "Gài bẫy", "bí mật phòng kề"],
        ["scan", "📡", "Quét bẫy", "dò phòng kề"],
      ];
      actions.innerHTML = defs.map(([id, icon, label, hint]) => {
        const isSearch = id === "search";
        const off = disabled || (id === "trap" && p.kits <= 0) || (id === "scan" && p.scans <= 0);
        return `
          <button class="btn small tm-action ${mode === id ? "active" : ""}" type="button" data-mode="${id}" ${off ? "disabled" : ""}>
            <span>${icon}</span><b>${label}</b><small>${hint}</small>
          </button>
          ${isSearch ? "" : ""}
        `;
      }).join("");
      actions.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.dataset.mode === "search") applyMove({ t: "search", side: ctx.mySeat }, false);
          else setMode(btn.dataset.mode);
        });
      });
    }

    function renderInfo() {
      const mySeat = ctx.isOnline ? ctx.mySeat : 0;
      const danger = Object.entries(knownDanger[mySeat] || {}).slice(-6).map(([k, v]) => {
        const p = parseKey(k);
        return `<span class="${v}"><b>${labelRoom(p.r, p.c)}</b><small>${v === "danger" ? "có dấu bẫy" : "tạm an toàn"}</small></span>`;
      }).join("") || "<span><b>Chưa có dữ liệu</b><small>Dùng Quét bẫy để ghi chú.</small></span>";
      info.innerHTML = `
        <div class="tm-notes"><b>Ghi chú quét</b><div>${danger}</div></div>
        <div class="tm-log"><b>Diễn biến</b><div>${log.map((x) => `<span>${x}</span>`).join("")}</div></div>
      `;
    }

    function updateStatus() {
      if (over) return;
      if (!ctx.isOnline) {
        ctx.setStatus("Trap Mansion chỉ chơi online để bẫy của mỗi người được giữ bí mật.");
        return;
      }
      if (awaiting) return ctx.setStatus("Đang chờ đối thủ xác nhận bẫy bí mật...");
      if (turn !== ctx.mySeat) return ctx.setStatus("Đối thủ đang đi trong biệt thự. Bạn chỉ thấy bẫy của mình.");
      const p = actor(ctx.mySeat);
      if (p.stun > 0) return ctx.setStatus("Bạn đang bị kẹt bởi bẫy. Gỡ cơ chế khóa để bỏ lượt.");
      const text = {
        move: "Chọn một phòng kề để di chuyển. Nếu có bẫy đối thủ, bạn sẽ chỉ biết sau khi bước vào.",
        trap: "Chọn phòng hiện tại hoặc phòng kề để gài bẫy bí mật.",
        scan: "Chọn phòng hiện tại hoặc phòng kề để quét dấu bẫy đối thủ.",
        search: "Bấm Lục phòng để tìm ấn cổ, vật phẩm hoặc rủi ro trong phòng hiện tại.",
      };
      ctx.setStatus(text[mode]);
    }

    function draw() {
      g.clearRect(0, 0, W, H);
      drawMansion();
      drawRooms();
      drawPlayers();
      drawLegend();
    }

    function tint(hex, a) {
      const h = hex.replace("#", "");
      const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
      const n = parseInt(full, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    function drawMansion() {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#171d39");
      bg.addColorStop(1, "#080c19");
      g.fillStyle = bg;
      roundRect(g, 0, 0, W, H, 16);
      g.fill();

      g.strokeStyle = "rgba(255,255,255,0.07)";
      g.lineWidth = 2;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const pos = roomPos(r, c);
          if (c < N - 1) {
            g.beginPath();
            g.moveTo(pos.x + ROOM_SIZE, pos.y + ROOM_SIZE / 2);
            g.lineTo(pos.x + ROOM_SIZE + GAP, pos.y + ROOM_SIZE / 2);
            g.stroke();
          }
          if (r < N - 1) {
            g.beginPath();
            g.moveTo(pos.x + ROOM_SIZE / 2, pos.y + ROOM_SIZE);
            g.lineTo(pos.x + ROOM_SIZE / 2, pos.y + ROOM_SIZE + GAP);
            g.stroke();
          }
        }
      }
    }

    function drawRooms() {
      const side = ctx.isOnline ? ctx.mySeat : 0;
      const me = actor(side);
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const pos = roomPos(r, c);
          const k = key(r, c);
          const seen = discovered[side]?.has(k) || same(r, c, starts[0]) || same(r, c, starts[1]) || same(r, c, vault);
          const selected = selectedRoom === k;
          const hovered = hoverRoom === k;
          const selectable = isMyTurn() && me.stun <= 0 && selectableRoom(r, c);
          const standingHere = same(r, c, me);
          const room = roomAt(r, c);
          const type = seen ? room.type : "unknown";
          const def = TYPES[type] || { label: "Phòng ẩn", icon: "❓", color: "#9aa0d0" };

          // nền ô — pha màu nhạt theo loại phòng
          if (!seen) g.fillStyle = "rgba(255,255,255,0.03)";
          else if (same(r, c, vault)) g.fillStyle = "rgba(255,209,102,0.16)";
          else g.fillStyle = tint(def.color, 0.12);
          roundRect(g, pos.x, pos.y, ROOM_SIZE, ROOM_SIZE, 10);
          g.fill();

          if (hovered && selectable) {
            g.fillStyle = "rgba(255,255,255,0.09)";
            roundRect(g, pos.x, pos.y, ROOM_SIZE, ROOM_SIZE, 10);
            g.fill();
          }

          // viền — ô chọn được thì phát sáng nhấp nháy
          if (selectable) {
            const a = 0.55 + pulse * 0.45;
            g.save();
            g.shadowColor = `rgba(110,231,183,${a})`;
            g.shadowBlur = 8 + pulse * 9;
            g.strokeStyle = `rgba(110,231,183,${0.7 + pulse * 0.3})`;
            g.lineWidth = 2.5;
            roundRect(g, pos.x + 1.5, pos.y + 1.5, ROOM_SIZE - 3, ROOM_SIZE - 3, 9);
            g.stroke();
            g.restore();
          } else {
            g.strokeStyle = selected ? "#ffd166" : "rgba(255,255,255,0.13)";
            g.lineWidth = selected ? 2.5 : 1;
            roundRect(g, pos.x, pos.y, ROOM_SIZE, ROOM_SIZE, 10);
            g.stroke();
          }

          // vòng đánh dấu phòng người chơi đang đứng
          if (standingHere) {
            g.save();
            g.strokeStyle = side === 0 ? "rgba(255,93,115,0.85)" : "rgba(77,208,225,0.85)";
            g.setLineDash([5, 4]);
            g.lineWidth = 2;
            roundRect(g, pos.x + 3.5, pos.y + 3.5, ROOM_SIZE - 7, ROOM_SIZE - 7, 8);
            g.stroke();
            g.restore();
          }

          // nội dung
          if (!seen) {
            g.fillStyle = "rgba(255,255,255,0.28)";
            g.font = "900 24px Segoe UI, sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText("?", pos.x + ROOM_SIZE / 2, pos.y + ROOM_SIZE / 2);
          } else {
            g.font = "24px 'Segoe UI Emoji', 'Segoe UI', sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(def.icon, pos.x + ROOM_SIZE / 2, pos.y + 27);
            g.fillStyle = "#e9ecff";
            g.font = "800 9px Segoe UI, sans-serif";
            wrapText(def.label, pos.x + ROOM_SIZE / 2, pos.y + 50, ROOM_SIZE - 8, 11);
          }

          const ownTrap = myTraps.find((t) => t.k === k);
          if (ownTrap) drawTrapIcon(pos.x + 5, pos.y + 5, ownTrap.type, true);
          const revealed = revealedTraps.find((t) => key(t.r, t.c) === k);
          if (revealed) drawTrapIcon(pos.x + ROOM_SIZE - 25, pos.y + 5, revealed.type, false);

          const scan = knownDanger[side]?.[k];
          if (scan) {
            g.save();
            g.fillStyle = scan === "danger" ? "#ff5d73" : "#6ee7b7";
            g.beginPath();
            g.arc(pos.x + ROOM_SIZE - 11, pos.y + ROOM_SIZE - 11, 6, 0, Math.PI * 2);
            g.fill();
            g.restore();
          }
        }
      }
    }

    function drawTrapIcon(x, y, type, own) {
      const def = TRAPS[type] || TRAPS.snare;
      g.save();
      g.fillStyle = own ? "rgba(255,209,102,0.95)" : "rgba(255,93,115,0.92)";
      roundRect(g, x, y, 20, 18, 5);
      g.fill();
      g.font = "12px 'Segoe UI Emoji', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(def.icon, x + 10, y + 10);
      g.restore();
    }

    function drawPlayers() {
      players.forEach((p, side) => {
        const pos = roomPos(p.r, p.c);
        const both = same(players[0].r, players[0].c, players[1]);
        const dx = both ? (side === 0 ? -13 : 13) : 0;
        const x = pos.x + ROOM_SIZE / 2 + dx;
        const y = pos.y + ROOM_SIZE - 15;
        const color = side === 0 ? "#ff5d73" : "#4dd0e1";
        g.save();
        g.translate(x, y);
        g.fillStyle = "rgba(0,0,0,0.32)";
        g.beginPath();
        g.ellipse(0, 8, 10, 3.5, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = side === 0 ? "#6d2136" : "#15566a";
        roundRect(g, -10, -3, 20, 20, 7);
        g.fill();
        g.fillStyle = color;
        g.beginPath();
        g.arc(0, -9, 7.5, 0, Math.PI * 2);
        g.fill();
        if (p.stun > 0) {
          g.fillStyle = "#ffd166";
          g.font = "900 8px Segoe UI, sans-serif";
          g.textAlign = "center";
          g.fillText("KẸT", 0, -21);
        }
        g.fillStyle = "#fff";
        g.font = "900 9px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("P" + (side + 1), 0, 8);
        g.restore();
      });
    }

    function drawLegend() {
      g.save();
      g.fillStyle = "rgba(10,12,24,0.5)";
      roundRect(g, PAD, 7, W - PAD * 2, 18, 999);
      g.fill();
      g.fillStyle = "#ffd166";
      g.font = "900 11px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("🏚️ TRAP MANSION", W / 2, 17);
      g.restore();
    }

    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = String(text).split(" ");
      let line = "";
      let yy = y;
      words.forEach((word) => {
        const test = line ? line + " " + word : word;
        if (g.measureText(test).width > maxWidth && line) {
          g.fillText(line, x, yy);
          line = word;
          yy += lineHeight;
        } else {
          line = test;
        }
      });
      if (line) g.fillText(line, x, yy);
    }

    function roundRect(gc, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      gc.beginPath();
      gc.moveTo(x + rr, y);
      gc.lineTo(x + w - rr, y);
      gc.quadraticCurveTo(x + w, y, x + w, y + rr);
      gc.lineTo(x + w, y + h - rr);
      gc.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      gc.lineTo(x + rr, y + h);
      gc.quadraticCurveTo(x, y + h, x, y + h - rr);
      gc.lineTo(x, y + rr);
      gc.quadraticCurveTo(x, y, x + rr, y);
      gc.closePath();
    }

    canvas.addEventListener("click", clickCanvas);

    canvas.addEventListener("mousemove", (e) => {
      if (!isMyTurn() || actor(ctx.mySeat).stun > 0) {
        if (hoverRoom !== null) { hoverRoom = null; canvas.style.cursor = "default"; draw(); }
        return;
      }
      const pt = canvasPoint(e);
      const room = findRoomAt(pt.x, pt.y);
      const k = room ? key(room.r, room.c) : null;
      const sel = room && selectableRoom(room.r, room.c);
      canvas.style.cursor = sel ? "pointer" : "default";
      if (k !== hoverRoom) { hoverRoom = k; draw(); }
    });

    canvas.addEventListener("mouseleave", () => {
      if (hoverRoom !== null) { hoverRoom = null; canvas.style.cursor = "default"; draw(); }
    });

    if (!ctx.isOnline) {
      render();
      updateStatus();
      return { applyMove: () => {} };
    }
    ctx.setNames(`Người chơi 1${ctx.mySeat === 0 ? " (bạn)" : ""}`, `Người chơi 2${ctx.mySeat === 1 ? " (bạn)" : ""}`);
    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "trapmansion",
    name: "Trap Mansion",
    emoji: "🏚️",
    description: "Hai người dò đường trong biệt thự ẩn phòng, tự thấy bẫy của mình nhưng không thấy bẫy đối thủ.",
    onlineReady: true,
    localReady: false,
    options: [
      {
        id: "size",
        label: "Kích thước biệt thự",
        default: 5,
        choices: [
          { value: 5, label: "5x5" },
          { value: 6, label: "6x6 dài hơn" },
        ],
      },
      {
        id: "goal",
        label: "Ấn cổ cần gom",
        default: 3,
        choices: [
          { value: 2, label: "2 ấn" },
          { value: 3, label: "3 ấn" },
          { value: 4, label: "4 ấn" },
        ],
      },
      {
        id: "traps",
        label: "Bẫy bí mật ban đầu",
        default: 3,
        choices: [
          { value: 2, label: "2 bẫy" },
          { value: 3, label: "3 bẫy" },
          { value: 4, label: "4 bẫy" },
        ],
      },
      {
        id: "hp",
        label: "Máu nhà thám hiểm",
        default: 60,
        choices: [
          { value: 45, label: "45 HP" },
          { value: 60, label: "60 HP" },
          { value: 75, label: "75 HP" },
        ],
      },
    ],
    howTo: [
      "Game chỉ chơi online để bẫy của mỗi người được giữ bí mật.",
      "Mỗi người thấy bẫy của mình trên bản đồ, nhưng bẫy đối thủ chỉ lộ khi quét ra hoặc kích hoạt.",
      "Di chuyển sang phòng kề để khám phá biệt thự. Phòng chưa biết sẽ hiện dấu hỏi cho đến khi bạn phát hiện hoặc lục phòng.",
      "Lục phòng để tìm ấn cổ, hồi máu, bộ bẫy, lượt quét hoặc gặp phòng nguyền.",
      "Gài bẫy ở phòng hiện tại hoặc phòng kề. Đối thủ chỉ biết bạn đã gài bẫy, không biết ở đâu.",
      "Quét bẫy để kiểm tra phòng hiện tại hoặc phòng kề. Ghi chú quét sẽ giúp bạn né đường nguy hiểm.",
      "Gom đủ ấn cổ rồi bước vào Kho trung tâm để thắng. Nếu hết HP vì bẫy hoặc phòng nguyền thì thua.",
    ],
    create,
  });
})();
