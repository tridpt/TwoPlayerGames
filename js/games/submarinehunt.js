/* Submarine Hunt - online hidden information duel. */
(function () {
  const N = 9;
  const MAX_HP = 3;
  const REEFS = new Set([31, 32, 40, 48, 49]);
  const START_ROWS = [N - 2, N - 1];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function create(ctx) {
    const o = ctx.options || {};
    const dronesMax = o.drones || 3;
    const chargesMax = o.charges || 6;
    const divesMax = o.dives === undefined ? 2 : Number(o.dives);

    let phase = "setup"; // setup | play | over
    let turn = 0; // 0 submarine, 1 hunter
    let round = 1;
    let awaiting = false;
    let mode = ctx.mySeat === 1 ? "sonar" : "move";
    let pendingStart = null;
    let sub = null; // only real on submarine client
    let subHp = MAX_HP;
    let drones = dronesMax;
    let charges = chargesMax;
    let dives = divesMax;
    let shield = false;
    let lastNoise = null;
    let finalSub = null;
    const marks = Object.create(null);
    const log = ["Tàu ngầm phải lẩn qua vùng săn và thoát lên tuyến phía Bắc."];

    const root = document.createElement("div");
    root.className = "sh-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "sh-hud";
    root.appendChild(hud);

    const boardWrap = document.createElement("div");
    boardWrap.className = "sh-board-wrap";
    const grid = document.createElement("div");
    grid.className = "sh-grid";
    grid.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    boardWrap.appendChild(grid);
    root.appendChild(boardWrap);

    const controls = document.createElement("div");
    controls.className = "sh-controls";
    root.appendChild(controls);

    const intel = document.createElement("div");
    intel.className = "sh-intel";
    root.appendChild(intel);

    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement("button");
      cell.className = "sh-cell";
      cell.type = "button";
      cell.addEventListener("click", () => onCell(i));
      grid.appendChild(cell);
      cells.push(cell);
    }

    function rc(i) {
      return [Math.floor(i / N), i % N];
    }

    function idx(r, c) {
      return r * N + c;
    }

    function inside(r, c) {
      return r >= 0 && r < N && c >= 0 && c < N;
    }

    function key(r, c) {
      return `${r},${c}`;
    }

    function isWater(i) {
      return i >= 0 && i < N * N && !REEFS.has(i);
    }

    function manhattan(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    }

    function chebyshev(a, b) {
      return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
    }

    function addLog(text) {
      log.unshift(text);
      while (log.length > 6) log.pop();
    }

    function subSVG(variant) {
      const hull = variant === "final" ? "#b91c3c" : "#f5c542";
      const dark = variant === "final" ? "#7f1020" : "#c9990f";
      return `<svg class="sh-sub-svg" viewBox="0 0 64 40" aria-hidden="true">
        <g>
          <path d="M2 22 q6 -11 24 -11 h18 q14 0 18 11 q-4 11 -18 11 h-18 q-18 0 -24 -11 z" fill="${hull}" stroke="${dark}" stroke-width="2"/>
          <rect x="28" y="4" width="11" height="10" rx="2.5" fill="${hull}" stroke="${dark}" stroke-width="2"/>
          <line x1="33" y1="4" x2="33" y2="-2" stroke="${dark}" stroke-width="2.5"/>
          <circle cx="33" cy="-2" r="2" fill="${dark}"/>
          <circle cx="16" cy="22" r="3" fill="#0c1a2e"/>
          <circle cx="28" cy="22" r="3" fill="#0c1a2e"/>
          <circle cx="40" cy="22" r="3" fill="#0c1a2e"/>
          <path d="M60 14 l4 8 l-4 8 q-3 -8 0 -16 z" fill="${dark}"/>
        </g>
      </svg>`;
    }

    function bearingIcon(b) {
      return b === "Bắc" ? "⬆️" : b === "Nam" ? "⬇️" : b === "Tây" ? "⬅️" : "➡️";
    }

    function canAct() {
      return !over() && !awaiting && ctx.isOnline && turn === ctx.mySeat;
    }

    function over() {
      return phase === "over";
    }

    function validStart(i) {
      const [r] = rc(i);
      return START_ROWS.includes(r) && isWater(i);
    }

    function subTargets() {
      if (!sub) return [];
      const list = [];
      DIRS.forEach(([dr, dc]) => {
        const nr = sub.r + dr;
        const nc = sub.c + dc;
        const ni = idx(nr, nc);
        if (inside(nr, nc) && isWater(ni)) list.push(ni);
      });
      return list;
    }

    function decoyTargets() {
      if (!sub) return [];
      const list = [idx(sub.r, sub.c)];
      DIRS.forEach(([dr, dc]) => {
        const nr = sub.r + dr;
        const nc = sub.c + dc;
        const ni = idx(nr, nc);
        if (inside(nr, nc) && isWater(ni)) list.push(ni);
      });
      return list;
    }

    function onCell(i) {
      if (!ctx.isOnline || over()) return;
      const [r, c] = rc(i);
      if (!isWater(i)) return;

      if (phase === "setup") {
        if (ctx.mySeat !== 0 || !validStart(i)) return;
        pendingStart = { r, c };
        render();
        return;
      }

      if (!canAct()) return;

      if (ctx.mySeat === 0) {
        if (mode === "decoy") {
          if (!decoyTargets().includes(i)) return;
          doSubAction({ t: "subAction", kind: "decoy", r, c }, false);
          return;
        }
        if (!subTargets().includes(i)) return;
        doSubAction({ t: "subAction", kind: mode === "silent" ? "silent" : "move", r, c }, false);
        return;
      }

      if (ctx.mySeat === 1) {
        doHunt({ t: "hunt", kind: mode, r, c }, false);
      }
    }

    function confirmStart() {
      if (!pendingStart || ctx.mySeat !== 0 || phase !== "setup") return;
      sub = { r: pendingStart.r, c: pendingStart.c };
      phase = "play";
      turn = 0;
      ctx.sendMove({ t: "ready" });
      ctx.setTurn(0);
      addLog("Tàu ngầm đã lặn. Hãy chọn hướng di chuyển đầu tiên.");
      render();
      updateStatus();
    }

    function beginHunterSide() {
      phase = "play";
      turn = 0;
      ctx.setTurn(0);
      addLog("Tàu ngầm đã lặn. Chờ tín hiệu âm thanh đầu tiên.");
      render();
      updateStatus();
    }

    function noiseFor(point, silent, decoy) {
      if (silent) {
        return { silent: true, text: "Tàu ngầm chạy im lặng, không có tín hiệu rõ.", zoneR: -1, zoneC: -1 };
      }
      const zoneR = point.r <= 2 ? 0 : point.r <= 5 ? 1 : 2;
      const zoneC = point.c <= 2 ? 0 : point.c <= 5 ? 1 : 2;
      const rows = ["Bắc", "Trung tâm", "Nam"];
      const cols = ["Tây", "giữa", "Đông"];
      return {
        silent: false,
        decoy: !!decoy,
        zoneR,
        zoneC,
        text: `${decoy ? "Tín hiệu giả" : "Âm chân vịt"} vọng từ vùng ${rows[zoneR]}-${cols[zoneC]}.`,
      };
    }

    function doSubAction(move, fromRemote) {
      if (fromRemote) {
        applySubEvent(move);
        return;
      }
      if (ctx.mySeat !== 0 || phase !== "play" || turn !== 0 || awaiting || !sub) return;

      let point = { r: Number(move.r), c: Number(move.c) };
      let silent = move.kind === "silent";
      let decoy = move.kind === "decoy";
      if (decoy) {
        if (!decoyTargets().includes(idx(point.r, point.c))) return;
      } else {
        if (!subTargets().includes(idx(point.r, point.c))) return;
        sub = point;
      }

      const noise = noiseFor(point, silent, decoy);
      const escaped = !decoy && sub.r === 0;
      ctx.sendMove({ t: "subEvent", noise, escaped, round });
      lastNoise = noise;
      addLog(noise.text);
      if (escaped) {
        render();
        finish(0, "tàu ngầm đã vượt tuyến phía Bắc");
        return;
      }
      turn = 1;
      ctx.sound(silent ? "select" : "place");
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function doDive() {
      if (ctx.mySeat !== 0 || phase !== "play" || turn !== 0 || awaiting || !sub || dives <= 0) return;
      dives -= 1;
      shield = true;
      const noise = { silent: true, text: "Tàu ngầm lặn sâu — biến mất khỏi sonar.", zoneR: -1, zoneC: -1 };
      ctx.sendMove({ t: "subEvent", noise, escaped: false, round, dived: true });
      lastNoise = noise;
      addLog("Bạn lặn sâu: chặn sát thương quả mìn kế tiếp. Lượt này không di chuyển.");
      turn = 1;
      ctx.sound("select");
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function applySubEvent(move) {
      if (phase !== "play") return;
      lastNoise = move.noise || null;
      addLog(lastNoise?.text || "Tàu ngầm đổi vị trí.");
      if (move.escaped) {
        render();
        finish(0, "tàu ngầm đã vượt tuyến phía Bắc");
        return;
      }
      turn = 1;
      ctx.sound(lastNoise?.silent ? "select" : "place");
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function spendTool(kind) {
      if (kind === "drone") {
        if (drones <= 0) return false;
        drones -= 1;
      }
      if (kind === "charge") {
        if (charges <= 0) return false;
        charges -= 1;
      }
      return true;
    }

    function doHunt(move, fromRemote) {
      if (phase !== "play" || turn !== 1 || awaiting) return;
      const r = Number(move.r);
      const c = Number(move.c);
      const i = idx(r, c);
      if (!inside(r, c) || !isWater(i)) return;
      if (!spendTool(move.kind)) return;

      if (!fromRemote) {
        awaiting = true;
        marks[key(r, c)] = { kind: move.kind, cls: "pending", icon: "⏳", text: labelForTool(move.kind) };
        ctx.sendMove({ t: "hunt", kind: move.kind, r, c });
        addLog(`${labelForTool(move.kind)} đang quét tọa độ ${r + 1}-${c + 1}...`);
        ctx.sound("select");
        render();
        updateStatus();
        return;
      }

      const result = evaluateHunt(move.kind, { r, c });
      marks[key(r, c)] = result.mark;
      addLog(result.log);
      ctx.sendMove({ t: "huntResult", kind: move.kind, r, c, result });
      if (result.killed) {
        render();
        finish(1, "mìn sâu đã phá hủy tàu ngầm");
        return;
      }
      turn = 0;
      round += 1;
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function applyHuntResult(move) {
      awaiting = false;
      const result = move.result;
      if (!result) return;
      if (typeof result.hp === "number") subHp = result.hp;
      marks[key(move.r, move.c)] = result.mark || { kind: move.kind, cls: "miss", icon: "❔", text: "?" };
      addLog(result.log || "Có kết quả dò âm.");
      if (result.killed) {
        finalSub = result.final || null;
        render();
        finish(1, "mìn sâu đã phá hủy tàu ngầm");
        return;
      }
      turn = 0;
      round += 1;
      ctx.sound(result.sound || "select");
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function evaluateHunt(kind, target) {
      const d = manhattan(target, sub);
      const near = chebyshev(target, sub);
      if (kind === "sonar") {
        if (d === 0) {
          return {
            hp: subHp,
            sound: "capture",
            mark: { kind, cls: "hit", icon: "🎯", text: "KHÓA" },
            log: "Sonar khóa đúng vị trí tàu ngầm, cần thả mìn sâu để kết liễu.",
          };
        }
        if (d <= 2) {
          return {
            hp: subHp,
            sound: "shot",
            mark: { kind, cls: "hot", icon: "🔴", text: "GẦN" },
            log: "Sonar bắt tín hiệu rất gần mục tiêu.",
          };
        }
        if (d <= 4) {
          return {
            hp: subHp,
            sound: "select",
            mark: { kind, cls: "mid", icon: "🟡", text: "VỪA" },
            log: "Sonar có tín hiệu trung bình, tàu ngầm chưa xa.",
          };
        }
        return {
          hp: subHp,
          sound: "miss",
          mark: { kind, cls: "miss", icon: "🔵", text: "XA" },
          log: "Sonar chỉ nghe tiếng nền xa.",
        };
      }

      if (kind === "drone") {
        if (near <= 1) {
          return {
            hp: subHp,
            sound: "capture",
            mark: { kind, cls: "hit", icon: "🛰️", text: "THẤY" },
            log: "Drone dò âm phát hiện tàu ngầm trong vùng 3x3.",
          };
        }
        const bearing = bearingFrom(target, sub);
        return {
          hp: subHp,
          sound: "select",
          mark: { kind, cls: "mid", icon: bearingIcon(bearing), text: bearing },
          log: `Drone không thấy mục tiêu, nhưng âm lệch về phía ${bearing}.`,
        };
      }

      let damage = 0;
      if (d === 0) damage = 2;
      else if (d === 1) damage = 1;
      if (damage > 0 && shield) {
        shield = false;
        return {
          hp: subHp,
          sound: "miss",
          mark: { kind, cls: "miss", icon: "🛡️", text: "CHẶN" },
          log: "Tàu ngầm đã lặn sâu, quả mìn không gây sát thương!",
        };
      }
      subHp = Math.max(0, subHp - damage);
      if (subHp <= 0) {
        return {
          hp: subHp,
          killed: true,
          final: { r: sub.r, c: sub.c },
          sound: "capture",
          mark: { kind, cls: "hit", icon: "💥", text: "HẠ" },
          log: "Mìn sâu nổ trúng và phá hủy tàu ngầm.",
        };
      }
      if (damage > 0) {
        return {
          hp: subHp,
          sound: "shot",
          mark: { kind, cls: "hot", icon: "💥", text: `-${damage}` },
          log: `Mìn sâu nổ sát thân tàu, tàu ngầm còn ${subHp}/${MAX_HP} HP.`,
        };
      }
      return {
        hp: subHp,
        sound: "miss",
        mark: { kind, cls: "miss", icon: "🌊", text: "TRƯỢT" },
        log: "Mìn sâu nổ hụt, chỉ khuấy động đáy biển.",
      };
    }

    function bearingFrom(target, actual) {
      const dr = actual.r - target.r;
      const dc = actual.c - target.c;
      if (Math.abs(dr) >= Math.abs(dc)) return dr < 0 ? "Bắc" : "Nam";
      return dc < 0 ? "Tây" : "Đông";
    }

    function labelForTool(kind) {
      if (kind === "drone") return "DRONE";
      if (kind === "charge") return "MÌN";
      return "SONAR";
    }

    function applyMove(move, fromRemote) {
      if (!fromRemote || !move || over()) return;
      if (move.t === "ready") return beginHunterSide();
      if (move.t === "subEvent") return applySubEvent(move);
      if (move.t === "hunt") return doHunt(move, true);
      if (move.t === "huntResult") return applyHuntResult(move);
    }

    function finish(winner, reason) {
      if (phase === "over") return;
      phase = "over";
      awaiting = false;
      ctx.setTurn(-1);
      ctx.incScore(winner);
      if (ctx.mySeat === winner) ctx.setStatus(`🎉 Bạn thắng - ${reason}.`);
      else ctx.setStatus(`💀 Bạn thua - ${reason}.`);
      render();
    }

    function render() {
      renderHud();
      renderControls();
      renderBoard();
      renderIntel();
    }

    function renderHud() {
      const subActive = phase === "play" && turn === 0 && !over();
      const hunterActive = phase === "play" && turn === 1 && !over();
      let subSmall;
      if (ctx.mySeat === 0) {
        const dist = sub ? sub.r : null;
        const escTxt = dist === null ? "" : (dist === 0 ? "🟢 Đã tới tuyến thoát!" : `🧭 Còn ${dist} hàng tới tuyến thoát`);
        const shieldTxt = shield ? " · 🛡️ đang lặn sâu" : "";
        subSmall = `${escTxt}${shieldTxt} · 🌀 lặn ${dives}/${divesMax}`;
      } else {
        subSmall = "Mục tiêu đang ẩn dưới biển";
      }
      hud.innerHTML = `
        <div class="sh-panel ${subActive ? "active" : ""}">
          <span>🟡 P1 Tàu ngầm</span>
          <b>${subHp}/${MAX_HP} HP</b>
          <small>${subSmall}</small>
        </div>
        <div class="sh-mid">
          <b>${phase === "setup" ? "Chuẩn bị" : over() ? "Kết thúc" : "Pha " + round}</b>
          <span>${phase === "play" ? (turn === 0 ? "Tàu ngầm di chuyển" : "Thợ săn dò tìm") : "P1 chọn điểm lặn bí mật"}</span>
          <small>${lastNoise?.text || log[0] || ""}</small>
        </div>
        <div class="sh-panel ${hunterActive ? "active" : ""}">
          <span>🎯 P2 Thợ săn</span>
          <b>${drones}/${dronesMax} drone · ${charges}/${chargesMax} mìn</b>
          <small>${ctx.mySeat === 1 ? "Bạn dùng sonar, drone và mìn sâu" : "Đối thủ đang khoanh vùng bạn"}</small>
        </div>
      `;
    }

    function renderControls() {
      if (!ctx.isOnline) {
        controls.innerHTML = `<div class="sh-help">Submarine Hunt chỉ chơi online để giữ bí mật vị trí tàu ngầm.</div>`;
        return;
      }
      if (phase === "setup") {
        if (ctx.mySeat === 0) {
          controls.innerHTML = `
            <div class="sh-help">Chọn một ô ở 2 hàng dưới để lặn. Vị trí này không gửi cho đối thủ.</div>
            <button class="btn primary" data-confirm ${pendingStart ? "" : "disabled"}>Xác nhận điểm lặn</button>
          `;
          const btn = controls.querySelector("[data-confirm]");
          btn?.addEventListener("click", confirmStart);
        } else {
          controls.innerHTML = `<div class="sh-help">Đang chờ P1 chọn vị trí tàu ngầm bí mật...</div>`;
        }
        return;
      }

      if (ctx.mySeat === 0) {
        const disabled = turn !== 0 || over();
        controls.innerHTML = `
          <button class="btn small sh-mode ${mode === "move" ? "active" : ""}" data-mode="move" ${disabled ? "disabled" : ""}><b>Di chuyển</b><small>đi 1 ô, tạo tiếng ồn vùng</small></button>
          <button class="btn small sh-mode ${mode === "silent" ? "active" : ""}" data-mode="silent" ${disabled ? "disabled" : ""}><b>Chạy im</b><small>đi 1 ô, không phát vùng</small></button>
          <button class="btn small sh-mode ${mode === "decoy" ? "active" : ""}" data-mode="decoy" ${disabled ? "disabled" : ""}><b>Mồi âm</b><small>đứng yên, tạo tín hiệu giả</small></button>
          <button class="btn small sh-mode sh-dive" data-dive="1" ${disabled || dives <= 0 ? "disabled" : ""}><b>🌀 Lặn sâu</b><small>chặn 1 quả mìn · còn ${dives}</small></button>
        `;
        const diveBtn = controls.querySelector("[data-dive]");
        diveBtn?.addEventListener("click", doDive);
      } else {
        const disabled = turn !== 1 || awaiting || over();
        controls.innerHTML = `
          <button class="btn small sh-mode ${mode === "sonar" ? "active" : ""}" data-mode="sonar" ${disabled ? "disabled" : ""}><b>Sonar</b><small>ping khoảng cách</small></button>
          <button class="btn small sh-mode ${mode === "drone" ? "active" : ""}" data-mode="drone" ${disabled || drones <= 0 ? "disabled" : ""}><b>Drone</b><small>dò vùng 3x3 · còn ${drones}</small></button>
          <button class="btn small sh-mode ${mode === "charge" ? "active" : ""}" data-mode="charge" ${disabled || charges <= 0 ? "disabled" : ""}><b>Mìn sâu</b><small>gây sát thương · còn ${charges}</small></button>
        `;
      }
      controls.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          mode = btn.dataset.mode;
          render();
          updateStatus();
        });
      });
    }

    function renderBoard() {
      const targets = new Set();
      if (phase === "setup" && ctx.mySeat === 0) {
        for (let i = 0; i < N * N; i++) if (validStart(i)) targets.add(i);
      } else if (phase === "play" && canAct()) {
        if (ctx.mySeat === 0) {
          (mode === "decoy" ? decoyTargets() : subTargets()).forEach((i) => targets.add(i));
        } else {
          for (let i = 0; i < N * N; i++) if (isWater(i)) targets.add(i);
        }
      }

      for (let i = 0; i < N * N; i++) {
        const [r, c] = rc(i);
        const cell = cells[i];
        cell.className = "sh-cell";
        cell.innerHTML = "";
        cell.disabled = over() || !ctx.isOnline || !isWater(i);
        if (r === 0 && !REEFS.has(i)) cell.classList.add("sh-exit");
        if (REEFS.has(i)) {
          cell.classList.add("sh-reef");
          cell.innerHTML = `<span class="sh-reef-ic">🪨</span>`;
          continue;
        }

        if (lastNoise && !lastNoise.silent && ctx.mySeat === 1 && phase !== "setup") {
          const zr = r <= 2 ? 0 : r <= 5 ? 1 : 2;
          const zc = c <= 2 ? 0 : c <= 5 ? 1 : 2;
          if (zr === lastNoise.zoneR && zc === lastNoise.zoneC) cell.classList.add(lastNoise.decoy ? "sh-decoy-zone" : "sh-noise-zone");
        }

        const mark = marks[key(r, c)];
        if (mark) cell.classList.add("sh-mark", `sh-${mark.cls || "mid"}`);

        const isPendingStart = phase === "setup" && pendingStart && pendingStart.r === r && pendingStart.c === c;
        const isLiveSub = phase !== "setup" && ctx.mySeat === 0 && sub && sub.r === r && sub.c === c;
        const isFinalSub = finalSub && finalSub.r === r && finalSub.c === c;

        if (isFinalSub) {
          cell.classList.add("sh-sub", "sh-final");
          cell.innerHTML = subSVG("final");
        } else if (isPendingStart || isLiveSub) {
          cell.classList.add("sh-sub");
          if (isPendingStart) cell.classList.add("sh-selected");
          cell.innerHTML = subSVG();
        } else if (mark) {
          cell.innerHTML = `<span class="sh-mark-ic">${mark.icon || ""}</span><span class="sh-mark-txt">${mark.text || labelForTool(mark.kind)}</span>`;
        }

        if (targets.has(i)) cell.classList.add("sh-target");
      }
    }

    function renderIntel() {
      intel.innerHTML = `
        <div class="sh-log"><b>Nhật ký sonar</b>${log.map((x) => `<span>${x}</span>`).join("")}</div>
        <div class="sh-legend">
          <span><b>SONAR</b><small>GẦN/VỪA/XA theo khoảng cách.</small></span>
          <span><b>DRONE</b><small>Quét vùng 3x3 hoặc trả hướng âm.</small></span>
          <span><b>MÌN</b><small>Trúng gây 2 sát thương, sát cạnh gây 1.</small></span>
          <span><b>SUB xanh</b><small>Tàu ngầm thoát nếu lên hàng trên cùng.</small></span>
        </div>
      `;
    }

    function updateStatus() {
      if (!ctx.isOnline) {
        ctx.setStatus("Submarine Hunt chỉ chơi online để giữ bí mật vị trí tàu ngầm.");
        return;
      }
      if (phase === "setup") {
        ctx.setStatus(ctx.mySeat === 0 ? "Chọn điểm lặn ở 2 hàng dưới rồi xác nhận." : "Đang chờ tàu ngầm chọn điểm lặn.");
        return;
      }
      if (over()) return;
      if (awaiting) {
        ctx.setStatus("Đang chờ tàu ngầm trả kết quả dò tìm...");
        return;
      }
      if (turn !== ctx.mySeat) {
        ctx.setStatus(turn === 0 ? "Tàu ngầm đang đổi vị trí." : "Thợ săn đang dò tìm.");
        return;
      }
      if (ctx.mySeat === 0) {
        ctx.setStatus(mode === "decoy" ? "Chọn ô quanh tàu để phát tín hiệu giả." : "Chọn ô kề để di chuyển. Hàng trên cùng là tuyến thoát.");
      } else {
        ctx.setStatus("Chọn một ô biển để dùng " + labelForTool(mode).toLowerCase() + ".");
      }
    }

    if (!ctx.isOnline) {
      render();
      updateStatus();
      return { applyMove: () => {} };
    }

    ctx.setNames(`P1 Tàu ngầm${ctx.mySeat === 0 ? " (bạn)" : ""}`, `P2 Thợ săn${ctx.mySeat === 1 ? " (bạn)" : ""}`);
    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "submarinehunt",
    name: "Submarine Hunt",
    emoji: "🛟",
    description: "Một bên lái tàu ngầm ẩn, bên kia săn bằng sonar, drone dò âm và mìn sâu.",
    onlineReady: true,
    localReady: false,
    options: [
      {
        id: "drones",
        label: "Drone dò âm",
        default: 3,
        choices: [
          { value: 2, label: "2 drone" },
          { value: 3, label: "3 drone" },
          { value: 4, label: "4 drone" },
        ],
      },
      {
        id: "charges",
        label: "Mìn sâu",
        default: 6,
        choices: [
          { value: 5, label: "5 mìn" },
          { value: 6, label: "6 mìn" },
          { value: 7, label: "7 mìn" },
        ],
      },
      {
        id: "dives",
        label: "Lặn sâu (chặn mìn)",
        default: 2,
        choices: [
          { value: 0, label: "Tắt" },
          { value: 2, label: "2 lần" },
          { value: 3, label: "3 lần" },
        ],
      },
    ],
    howTo: [
      "Game chỉ chơi online. Người chơi 1 là tàu ngầm, Người chơi 2 là thợ săn.",
      "P1 chọn điểm lặn bí mật ở 2 hàng dưới. Vị trí thật không gửi cho P2.",
      "Tàu ngầm mỗi lượt đi 1 ô, chạy im lặng hoặc tạo tín hiệu giả. Nếu lên hàng trên cùng thì tàu ngầm thắng.",
      "🌀 Lặn sâu: tàu ngầm bỏ lượt di chuyển để chặn hoàn toàn sát thương của quả mìn kế tiếp (số lần giới hạn).",
      "P2 dùng sonar để biết gần/vừa/xa, drone để quét vùng 3x3 hoặc lấy hướng âm, và mìn sâu để gây sát thương.",
      "Mìn sâu trúng chính xác gây 2 sát thương, nổ sát cạnh gây 1. Tàu ngầm có 3 HP.",
      "Đá ngầm 🪨 chặn đường di chuyển và không thể chọn làm mục tiêu.",
      "Đọc vùng tiếng ồn, kết quả sonar và hướng drone để khoanh vùng trước khi thả mìn.",
    ],
    create,
  });
})();
