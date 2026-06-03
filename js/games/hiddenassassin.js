/* Hidden Assassin - suy luan sat thu an trong dam dong, online-first de giu bi mat. */
(function () {
  const W = 900;
  const H = 560;
  const SUSPECT_NAMES = [
    "Ari", "Bryn", "Cato", "Dax", "Eris", "Finn", "Gale", "Hana",
    "Iris", "Juno", "Kade", "Lyra", "Miro", "Niko",
  ];
  const COVERS = ["phục vụ", "khách VIP", "nhạc công", "bảo vệ", "nhà báo", "ảo thuật gia", "đầu bếp"];
  const HOT_CLUES = [
    "liếc về lối thoát nhiều lần",
    "giấu vật kim loại dưới áo",
    "né camera an ninh",
    "đổi nhịp đi khi có người theo dõi",
    "đứng gần nạn nhân quá lâu",
  ];
  const COLD_CLUES = [
    "hành vi khớp vỏ bọc",
    "không có dấu hiệu vũ khí",
    "bị nhiều người nhận ra",
    "đường đi khá vô hại",
    "có chứng cứ ngoại phạm tạm ổn",
  ];
  const SPOTS = [
    { id: 0, name: "Sảnh chính", x: 450, y: 280, links: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: 1, name: "Quầy bar", x: 190, y: 170, links: [0, 3, 5] },
    { id: 2, name: "Ban công", x: 710, y: 170, links: [0, 4, 6] },
    { id: 3, name: "Phòng tranh", x: 190, y: 365, links: [0, 1, 7] },
    { id: 4, name: "Vườn kính", x: 710, y: 365, links: [0, 2, 8] },
    { id: 5, name: "Sân khấu", x: 360, y: 125, links: [0, 1, 6] },
    { id: 6, name: "Bếp sau", x: 610, y: 125, links: [0, 2, 5] },
    { id: 7, name: "Tượng đá", x: 330, y: 445, links: [0, 3, 8] },
    { id: 8, name: "Cổng phụ", x: 610, y: 445, links: [0, 4, 7] },
  ];

  function create(ctx) {
    const o = ctx.options || {};
    const TEAM = o.team || 6;
    const MAX_TRAPS = o.traps || 2;
    const NOTES_TO_WARN = o.notes || 3;

    let turn = 0;
    let mode = "move";
    let selected = null;
    let awaiting = false;
    let over = false;
    let moveNo = 1;
    const traps = [];
    const log = ["Đêm dạ tiệc bắt đầu. Một sát thủ đang lẩn trong đám đông."];
    const notes = [Object.create(null), Object.create(null)];
    const suspects = makeSuspects();
    const myAssassinId = pickMyAssassin();

    const root = document.createElement("div");
    root.className = "ha-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "ha-hud";
    root.appendChild(hud);

    const stageWrap = document.createElement("div");
    stageWrap.className = "ha-stage-wrap";
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "ha-canvas";
    stageWrap.appendChild(canvas);
    root.appendChild(stageWrap);
    const g = canvas.getContext("2d");

    const toolbar = document.createElement("div");
    toolbar.className = "ha-toolbar";
    root.appendChild(toolbar);

    const details = document.createElement("div");
    details.className = "ha-details";
    root.appendChild(details);

    function makeSuspects() {
      const list = [];
      for (let owner = 0; owner < 2; owner++) {
        const baseSpots = owner === 0 ? [1, 3, 5, 7, 0, 6, 8] : [2, 4, 6, 8, 0, 5, 7];
        for (let i = 0; i < TEAM; i++) {
          const name = SUSPECT_NAMES[owner * 7 + i] || `N${owner + 1}${i + 1}`;
          list.push({
            id: `p${owner}_${i}`,
            owner,
            idx: i,
            name,
            cover: COVERS[(owner * TEAM + i) % COVERS.length],
            spot: baseSpots[i % baseSpots.length],
            alive: true,
            stun: 0,
            revealed: false,
            x: 0,
            y: 0,
          });
        }
      }
      return list;
    }

    function pickMyAssassin() {
      if (!ctx.isOnline) return suspects.find((s) => s.owner === 0).id;
      const mine = suspects.filter((s) => s.owner === ctx.mySeat);
      return mine[Math.floor(Math.random() * mine.length)].id;
    }

    function canAct(fromRemote) {
      return !over && !awaiting && (fromRemote || !ctx.isOnline || turn === ctx.mySeat);
    }

    function isMine(s) {
      return ctx.isOnline ? s.owner === ctx.mySeat : s.owner === turn;
    }

    function isMyAssassin(id) {
      return id === myAssassinId;
    }

    function getSuspect(id) {
      return suspects.find((s) => s.id === id) || null;
    }

    function spot(id) {
      return SPOTS.find((s) => s.id === id) || SPOTS[0];
    }

    function addLog(text) {
      log.unshift(text);
      while (log.length > 6) log.pop();
    }

    function note(observer, targetId, amount, reason) {
      notes[observer][targetId] = Math.max(0, (notes[observer][targetId] || 0) + amount);
      const target = getSuspect(targetId);
      if (target && observer === ctx.mySeat && notes[observer][targetId] >= NOTES_TO_WARN) {
        addLog(`${target.name} đã có ${notes[observer][targetId]} dấu nghi vấn: nên cân nhắc tố cáo.`);
      }
      if (reason && observer === ctx.mySeat) addLog(reason);
    }

    function applyMove(move, fromRemote) {
      if (!move || over) return;
      if (!fromRemote && !canAct(false)) return;

      if (move.t === "move") return doMove(move, fromRemote);
      if (move.t === "trap") return doTrap(move, fromRemote);
      if (move.t === "observe") return doObserve(move, fromRemote);
      if (move.t === "observeResult") return doObserveResult(move);
      if (move.t === "accuse") return doAccuse(move, fromRemote);
      if (move.t === "accuseResult") return doAccuseResult(move);
      if (move.t === "kill") return doKill(move, fromRemote);
      if (move.t === "killResult") return doKillResult(move);
    }

    function doMove(move, fromRemote) {
      const s = getSuspect(move.id);
      const to = Number(move.spot);
      if (!s || s.owner !== turn || !legalMove(s, to)) return;
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "move", id: s.id, spot: to });
      s.spot = to;
      s.revealed = false;
      const trappedId = triggerTrap(s);
      addLog(`P${s.owner + 1} đưa ${s.name} đến ${spot(to).name}.`);
      selected = null;
      ctx.sound(trappedId ? "capture" : "place");
      endTurn(trappedId || null);
    }

    function doTrap(move, fromRemote) {
      const where = Number(move.spot);
      if (!SPOTS.some((s) => s.id === where)) return;
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "trap", spot: where });
      const mine = traps.filter((t) => t.owner === turn);
      if (mine.length >= MAX_TRAPS) {
        const oldest = mine[0];
        traps.splice(traps.indexOf(oldest), 1);
      }
      traps.push({ owner: turn, spot: where, id: `${turn}_${moveNo}_${where}` });
      addLog(`P${turn + 1} gài bẫy camera ở ${spot(where).name}.`);
      ctx.sound("select");
      endTurn();
    }

    function doObserve(move, fromRemote) {
      const target = getSuspect(move.target);
      if (!target || target.owner === turn || !target.alive) return;
      if (!canObserve(target)) return;

      if (!fromRemote) {
        awaiting = true;
        ctx.sendMove({ t: "observe", target: target.id });
        addLog(`Bạn đang quan sát ${target.name}, chờ tín hiệu từ đối thủ...`);
        render();
        updateStatus();
        return;
      }

      const hot = isMyAssassin(target.id);
      const clue = makeClue(hot);
      ctx.sendMove({ t: "observeResult", observer: 1 - ctx.mySeat, target: target.id, hot, clue });
      addLog(`Đối thủ vừa quan sát ${target.name}.`);
      endTurn();
    }

    function makeClue(hot) {
      const source = hot ? HOT_CLUES : COLD_CLUES;
      return source[Math.floor(Math.random() * source.length)];
    }

    function doObserveResult(move) {
      awaiting = false;
      const target = getSuspect(move.target);
      if (!target) return;
      note(ctx.mySeat, target.id, move.hot ? 2 : 0, `${target.name}: ${move.clue}.`);
      if (!move.hot) addLog(`${target.name} chưa có dấu hiệu nguy hiểm rõ ràng.`);
      ctx.sound(move.hot ? "capture" : "select");
      endTurn();
    }

    function doAccuse(move, fromRemote) {
      const target = getSuspect(move.target);
      if (!target || target.owner === turn || !target.alive) return;
      if (!fromRemote) {
        awaiting = true;
        ctx.sendMove({ t: "accuse", target: target.id });
        addLog(`Bạn tố cáo ${target.name}. Đang chờ đối thủ xác nhận danh tính.`);
        render();
        updateStatus();
        return;
      }

      const correct = isMyAssassin(target.id);
      ctx.sendMove({ t: "accuseResult", accuser: 1 - ctx.mySeat, target: target.id, correct });
      finish(correct ? 1 - ctx.mySeat : ctx.mySeat, correct
        ? `${target.name} đúng là sát thủ.`
        : `Tố cáo sai ${target.name}, sát thủ thật thoát thân.`);
    }

    function doAccuseResult(move) {
      awaiting = false;
      const winner = move.correct ? ctx.mySeat : 1 - ctx.mySeat;
      const target = getSuspect(move.target);
      finish(winner, move.correct
        ? `${target?.name || "mục tiêu"} đúng là sát thủ.`
        : `Tố cáo sai ${target?.name || "mục tiêu"}, đối thủ thắng.`);
    }

    function doKill(move, fromRemote) {
      const killer = getSuspect(move.killer);
      const target = getSuspect(move.target);
      if (!killer || !target || target.owner === turn || !target.alive) return;
      if (!sameSpot(killer, target)) return;

      if (!fromRemote) {
        if (!isMyAssassin(killer.id)) return;
        awaiting = true;
        ctx.sendMove({ t: "kill", killer: killer.id, target: target.id });
        addLog(`Bạn ra lệnh ám sát ${target.name}.`);
        render();
        updateStatus();
        return;
      }

      const correct = isMyAssassin(target.id);
      ctx.sendMove({ t: "killResult", attacker: 1 - ctx.mySeat, killer: killer.id, target: target.id, correct });
      finish(correct ? 1 - ctx.mySeat : ctx.mySeat, correct
        ? `Sát thủ đã hạ đúng sát thủ đối phương.`
        : `Ám sát nhầm dân thường, kẻ ra tay bị lộ.`);
    }

    function doKillResult(move) {
      awaiting = false;
      const winner = move.correct ? ctx.mySeat : 1 - ctx.mySeat;
      finish(winner, move.correct
        ? "Sát thủ của bạn đã hạ đúng mục tiêu."
        : "Ám sát nhầm, sát thủ của bạn bị lộ.");
    }

    function triggerTrap(s) {
      const trap = traps.find((t) => t.owner !== s.owner && t.spot === s.spot);
      if (!trap) return null;
      traps.splice(traps.indexOf(trap), 1);
      s.stun = Math.max(s.stun, 1);
      note(trap.owner, s.id, 1, trap.owner === ctx.mySeat ? `Bẫy bắt được ${s.name} ở ${spot(s.spot).name}.` : "");
      addLog(`${s.name} kích hoạt bẫy ở ${spot(s.spot).name} và bị kẹt 1 lượt.`);
      return s.id;
    }

    function legalMove(s, to) {
      if (!s.alive || s.stun > 0 || s.spot === to) return false;
      return spot(s.spot).links.includes(to);
    }

    function canObserve(target) {
      return suspects.some((s) => s.owner === turn && s.alive && (s.spot === target.spot || spot(s.spot).links.includes(target.spot)));
    }

    function sameSpot(a, b) {
      return a.spot === b.spot;
    }

    function endTurn(skipStunId) {
      if (over) return;
      suspects.forEach((s) => {
        if (s.owner === turn && s.stun > 0 && s.id !== skipStunId) s.stun -= 1;
      });
      selected = null;
      awaiting = false;
      turn = 1 - turn;
      moveNo += 1;
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function finish(winner, reason) {
      if (over) return;
      over = true;
      awaiting = false;
      suspects.forEach((s) => {
        if (s.id === myAssassinId) s.revealed = true;
      });
      ctx.setTurn(-1);
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng - ${reason}`);
      render();
    }

    function setMode(next) {
      if (awaiting || over) return;
      mode = next;
      selected = null;
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
      if (!canAct(false)) return;
      updatePositions();
      const p = canvasPoint(e);
      const targetSuspect = findSuspectAt(p.x, p.y);
      const targetSpot = findSpotAt(p.x, p.y);

      if (mode === "move") {
        if (targetSuspect && targetSuspect.owner === turn && isMine(targetSuspect)) {
          selected = targetSuspect.id;
          render();
          return;
        }
        if (selected && targetSpot) {
          applyMove({ t: "move", id: selected, spot: targetSpot.id }, false);
          return;
        }
      }

      if (mode === "trap" && targetSpot) {
        applyMove({ t: "trap", spot: targetSpot.id }, false);
        return;
      }

      if (targetSuspect && targetSuspect.owner !== turn) {
        if (mode === "observe") applyMove({ t: "observe", target: targetSuspect.id }, false);
        else if (mode === "accuse") applyMove({ t: "accuse", target: targetSuspect.id }, false);
        else if (mode === "kill") applyMove({ t: "kill", killer: myAssassinId, target: targetSuspect.id }, false);
      }
    }

    function findSuspectAt(x, y) {
      return suspects
        .filter((s) => s.alive)
        .slice()
        .reverse()
        .find((s) => Math.hypot(s.x - x, s.y - y) <= 20) || null;
    }

    function findSpotAt(x, y) {
      return SPOTS.find((s) => Math.hypot(s.x - x, s.y - y) <= 42) || null;
    }

    function updatePositions() {
      SPOTS.forEach((sp) => {
        [0, 1].forEach((owner) => {
          const here = suspects.filter((s) => s.alive && s.owner === owner && s.spot === sp.id);
          here.forEach((s, i) => {
            const side = owner === 0 ? -1 : 1;
            const row = Math.floor(i / 3);
            const col = i % 3;
            s.x = sp.x + side * (30 + col * 28);
            s.y = sp.y - 18 + row * 32;
          });
        });
      });
    }

    function render() {
      renderHud();
      renderToolbar();
      renderDetails();
      draw();
    }

    function renderHud() {
      const own = getSuspect(myAssassinId);
      hud.innerHTML = `
        <div class="ha-panel p1 ${turn === 0 && !over ? "active" : ""}">
          <span>Người chơi 1</span>
          <b>${aliveCount(0)} nhân vật</b>
          <small>${ctx.mySeat === 0 ? `Sát thủ của bạn: ${own?.name || "?"}` : "Danh tính sát thủ bị ẩn"}</small>
        </div>
        <div class="ha-mid">
          <b>${over ? "Kết thúc" : awaiting ? "Đang chờ xác nhận" : "Lượt " + (turn + 1)}</b>
          <span>${TEAM} nghi phạm mỗi bên · ${MAX_TRAPS} bẫy camera</span>
          <small>${log[0] || ""}</small>
        </div>
        <div class="ha-panel p2 ${turn === 1 && !over ? "active" : ""}">
          <span>Người chơi 2</span>
          <b>${aliveCount(1)} nhân vật</b>
          <small>${ctx.mySeat === 1 ? `Sát thủ của bạn: ${own?.name || "?"}` : "Danh tính sát thủ bị ẩn"}</small>
        </div>
      `;
    }

    function aliveCount(owner) {
      return suspects.filter((s) => s.owner === owner && s.alive).length;
    }

    function renderToolbar() {
      const buttons = [
        ["move", "MOVE", "Di chuyển", "chọn người rồi chọn địa điểm kề"],
        ["observe", "EYE", "Quan sát", "cần người của bạn ở gần mục tiêu"],
        ["trap", "CAM", "Gài bẫy", "camera ẩn tại một địa điểm"],
        ["accuse", "CALL", "Tố cáo", "đúng thắng, sai thua"],
        ["kill", "KILL", "Ám sát", "sát thủ phải cùng địa điểm"],
      ];
      toolbar.innerHTML = buttons.map(([id, icon, label, hint]) => `
        <button class="btn small ha-action ${mode === id ? "active" : ""}" type="button" data-mode="${id}" ${canAct(false) ? "" : "disabled"}>
          <span>${icon}</span><b>${label}</b><small>${hint}</small>
        </button>
      `).join("");
      toolbar.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => setMode(btn.dataset.mode));
      });
    }

    function renderDetails() {
      const myNotes = notes[ctx.mySeat] || {};
      const rows = suspects
        .filter((s) => s.owner !== ctx.mySeat)
        .map((s) => `<span><b>${s.name}</b><small>${myNotes[s.id] || 0} nghi vấn · ${spot(s.spot).name}</small></span>`)
        .join("");
      details.innerHTML = `
        <div class="ha-notes"><b>Sổ nghi vấn</b><div>${rows}</div></div>
        <div class="ha-log"><b>Diễn biến</b><div>${log.map((x) => `<span>${x}</span>`).join("")}</div></div>
      `;
    }

    function updateStatus() {
      if (over) return;
      if (!ctx.isOnline) {
        ctx.setStatus("Hidden Assassin chỉ chơi online để giữ bí mật danh tính sát thủ.");
        return;
      }
      if (awaiting) {
        ctx.setStatus("Đang chờ đối thủ xác nhận thông tin bí mật...");
        return;
      }
      if (turn !== ctx.mySeat) {
        ctx.setStatus("Đối thủ đang hành động. Hãy quan sát đường đi của họ.");
        return;
      }
      const text = {
        move: "Chọn nhân vật của bạn, rồi chọn một địa điểm nối liền để di chuyển.",
        observe: "Chọn nghi phạm đối thủ ở gần người của bạn để lấy manh mối.",
        trap: "Chọn một địa điểm để gài bẫy camera ẩn.",
        accuse: "Chọn nghi phạm đối thủ để tố cáo. Đúng thắng, sai thua.",
        kill: "Chọn mục tiêu cùng địa điểm với sát thủ của bạn để ám sát.",
      };
      ctx.setStatus(text[mode]);
    }

    function draw() {
      updatePositions();
      g.clearRect(0, 0, W, H);
      drawRoom();
      drawTraps();
      drawSuspects();
    }

    function drawRoom() {
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#171d39");
      bg.addColorStop(1, "#090d1d");
      g.fillStyle = bg;
      roundRect(g, 0, 0, W, H, 18);
      g.fill();

      g.strokeStyle = "rgba(255,255,255,0.08)";
      g.lineWidth = 2;
      SPOTS.forEach((sp) => {
        sp.links.forEach((id) => {
          const other = spot(id);
          if (other.id < sp.id) return;
          g.beginPath();
          g.moveTo(sp.x, sp.y);
          g.lineTo(other.x, other.y);
          g.stroke();
        });
      });

      SPOTS.forEach((sp) => {
        const active = selected && legalMove(getSuspect(selected), sp.id);
        g.fillStyle = active ? "rgba(110,231,183,0.18)" : "rgba(255,255,255,0.07)";
        g.strokeStyle = active ? "#6ee7b7" : "rgba(255,209,102,0.28)";
        g.lineWidth = active ? 3 : 2;
        g.beginPath();
        g.arc(sp.x, sp.y, 34, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = "#e9ecff";
        g.font = "800 12px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(sp.name, sp.x, sp.y + 53);
      });
    }

    function drawTraps() {
      traps.forEach((t) => {
        if (ctx.isOnline && t.owner !== ctx.mySeat && !over) return;
        const sp = spot(t.spot);
        g.save();
        g.translate(sp.x, sp.y - 42);
        g.fillStyle = t.owner === 0 ? "rgba(255,93,115,0.75)" : "rgba(77,208,225,0.75)";
        roundRect(g, -16, -10, 32, 20, 5);
        g.fill();
        g.fillStyle = "#101424";
        g.font = "900 9px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("CAM", 0, 0);
        g.restore();
      });
    }

    function drawSuspects() {
      suspects.forEach((s) => {
        if (!s.alive) return;
        const mine = isMine(s);
        const ownAssassin = mine && isMyAssassin(s.id);
        const color = s.owner === 0 ? "#ff5d73" : "#4dd0e1";
        const n = notes[ctx.mySeat]?.[s.id] || 0;
        g.save();
        g.globalAlpha = s.stun > 0 ? 0.62 : 1;
        g.translate(s.x, s.y);
        if (selected === s.id) {
          g.strokeStyle = "#ffd166";
          g.lineWidth = 4;
          g.beginPath();
          g.arc(0, 0, 22, 0, Math.PI * 2);
          g.stroke();
        }
        if (ownAssassin || (over && s.id === myAssassinId)) {
          g.strokeStyle = "#ffd166";
          g.lineWidth = 3;
          g.beginPath();
          g.arc(0, 0, 25, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = color;
        g.beginPath();
        g.arc(0, -5, 9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = s.owner === 0 ? "#6d2136" : "#15566a";
        roundRect(g, -13, 4, 26, 24, 8);
        g.fill();
        g.fillStyle = "#fff";
        g.font = "900 10px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(s.name, 0, 43);
        if (s.stun > 0) {
          g.fillStyle = "#ffd166";
          g.fillText("BẪY", 0, -22);
        } else if (!mine && n > 0) {
          g.fillStyle = "#ffd166";
          g.fillText("?" + n, 0, -22);
        }
        g.restore();
      });
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
    id: "hiddenassassin",
    name: "Hidden Assassin",
    emoji: "🕵️",
    description: "Nhiều nhân vật lẫn trong đám đông, mỗi bên giấu một sát thủ thật. Quan sát, gài bẫy, tố cáo hoặc ám sát.",
    onlineReady: true,
    localReady: false,
    options: [
      {
        id: "team",
        label: "Số nhân vật mỗi bên",
        default: 6,
        choices: [
          { value: 5, label: "5 nhân vật" },
          { value: 6, label: "6 nhân vật" },
          { value: 7, label: "7 nhân vật" },
        ],
      },
      {
        id: "traps",
        label: "Bẫy camera mỗi bên",
        default: 2,
        choices: [
          { value: 1, label: "1 bẫy" },
          { value: 2, label: "2 bẫy" },
          { value: 3, label: "3 bẫy" },
        ],
      },
      {
        id: "notes",
        label: "Mốc cảnh báo nghi vấn",
        default: 3,
        choices: [
          { value: 2, label: "2 dấu" },
          { value: 3, label: "3 dấu" },
          { value: 4, label: "4 dấu" },
        ],
      },
    ],
    howTo: [
      "Game chỉ chơi online để mỗi người giữ kín sát thủ thật của mình.",
      "Mỗi bên có nhiều nhân vật trong dạ tiệc. Bạn thấy sát thủ của mình, nhưng không biết sát thủ của đối thủ là ai.",
      "Di chuyển nhân vật qua các địa điểm nối liền. Quan sát mục tiêu khi có người của bạn đứng gần để lấy manh mối.",
      "Gài bẫy camera ở một địa điểm. Nếu đối thủ đi vào bẫy, nhân vật đó bị kẹt và tăng dấu nghi vấn trong sổ của bạn.",
      "Tố cáo đúng sát thủ đối thủ thì thắng ngay. Tố cáo sai thì thua.",
      "Ám sát chỉ dùng được khi sát thủ của bạn cùng địa điểm với mục tiêu. Hạ đúng sát thủ đối thủ thì thắng, giết nhầm thì thua.",
    ],
    create,
  });
})();
