/* Pool Battle - bi-a doi khang theo luot, co vat ly va power-up. */
(function () {
  const W = 820;
  const H = 500;
  const LEFT = 54;
  const RIGHT = W - 54;
  const TOP = 58;
  const BOTTOM = H - 46;
  const BALL_R = 10;
  const CUE_R = 11;
  const POCKET_R = 24;
  const CUSHION = 0.86;
  const STOP_SPEED = 0.045;
  const SUBSTEPS = 2;
  const MAX_FRAMES = 1500;
  const POWER_SCALE = 0.16;
  const TOKEN_KEYS = ["bomb", "magnet", "gravity"];

  const MODE_DEFS = {
    normal: { label: "Chọc thường", icon: "CUE", hint: "không tốn" },
    bomb: { label: "Bóng nổ", icon: "BOOM", hint: "va chạm đầu" },
    magnet: { label: "Nam châm", icon: "MAG", hint: "hút bi gần" },
    gravity: { label: "Đổi trọng lực", icon: "TILT", hint: "nghiêng bàn" },
  };

  const TOKEN_DEFS = {
    bomb: { label: "Bóng nổ", color: "#ff9f5d", letter: "B" },
    magnet: { label: "Nam châm", color: "#8be6f0", letter: "M" },
    gravity: { label: "Đổi trọng lực", color: "#ffd166", letter: "G" },
  };

  const POCKETS = [
    { x: LEFT, y: TOP },
    { x: W / 2, y: TOP - 2 },
    { x: RIGHT, y: TOP },
    { x: LEFT, y: BOTTOM },
    { x: W / 2, y: BOTTOM + 2 },
    { x: RIGHT, y: BOTTOM },
  ];

  const OBJECT_COLORS = [
    "#ffd166", "#6ee7b7", "#f779a0", "#8be6f0", "#c792ea",
    "#ffb86b", "#9bd86d", "#ef476f", "#5dd8ff", "#f4d35e", "#b8f2e6",
  ];

  function create(ctx) {
    const o = ctx.options || {};
    const TARGET = o.target || 7;
    const OBJECTS = o.balls || 9;
    const TOKEN_COUNT = o.powerups == null ? 6 : o.powerups;
    const friction = o.cloth === "fast" ? 0.989 : o.cloth === "heavy" ? 0.974 : 0.982;

    const players = [
      { angle: 0, power: 64, color: "#ff5d73", name: "Đỏ" },
      { angle: 180, power: 64, color: "#4dd0e1", name: "Xanh" },
    ];
    const scores = [0, 0];
    const inventory = [
      { bomb: TOKEN_COUNT ? 1 : 0, magnet: TOKEN_COUNT ? 1 : 0, gravity: TOKEN_COUNT ? 1 : 0 },
      { bomb: TOKEN_COUNT ? 1 : 0, magnet: TOKEN_COUNT ? 1 : 0, gravity: TOKEN_COUNT ? 1 : 0 },
    ];

    const balls = makeBalls(OBJECTS);
    const tokens = makeTokens(TOKEN_COUNT, balls);

    let turn = 0;
    let selectedMode = "normal";
    let busy = false;
    let over = false;
    let raf = null;
    let shot = null;
    let settledFrames = 0;
    let last = "Ngắm hướng, chỉnh lực rồi chọc bi.";

    const root = document.createElement("div");
    root.className = "pool-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "pool-hud";
    root.appendChild(hud);

    const tableWrap = document.createElement("div");
    tableWrap.className = "pool-table-wrap";
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "pool-canvas";
    tableWrap.appendChild(canvas);
    root.appendChild(tableWrap);
    const g = canvas.getContext("2d");

    const controls = document.createElement("div");
    controls.className = "pool-controls";
    controls.innerHTML = `
      <div class="pool-field">
        <label>Hướng</label>
        <input class="pool-angle" type="range" min="0" max="359" value="0">
        <span class="pool-val pool-angle-val">0°</span>
      </div>
      <div class="pool-field">
        <label>Lực</label>
        <input class="pool-power" type="range" min="20" max="100" value="64">
        <span class="pool-val pool-power-val">64</span>
      </div>
      <div class="pool-modes"></div>
      <button class="btn primary pool-shoot" type="button">Chọc bi</button>
    `;
    root.appendChild(controls);

    const angleInput = controls.querySelector(".pool-angle");
    const powerInput = controls.querySelector(".pool-power");
    const angleVal = controls.querySelector(".pool-angle-val");
    const powerVal = controls.querySelector(".pool-power-val");
    const modeBox = controls.querySelector(".pool-modes");
    const shootBtn = controls.querySelector(".pool-shoot");

    Object.keys(MODE_DEFS).forEach((id) => {
      const def = MODE_DEFS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn small pool-mode";
      btn.dataset.mode = id;
      btn.innerHTML = `<span>${def.icon}</span><b>${def.label}</b><small>${def.hint}</small>`;
      btn.addEventListener("click", () => {
        if (!canControl()) return;
        if (id !== "normal" && inventory[turn][id] <= 0) return;
        selectedMode = id;
        renderHud();
        syncControls();
        draw();
      });
      modeBox.appendChild(btn);
    });

    angleInput.addEventListener("input", () => {
      players[turn].angle = Number(angleInput.value);
      syncControlLabels();
      draw();
    });
    powerInput.addEventListener("input", () => {
      players[turn].power = Number(powerInput.value);
      syncControlLabels();
      draw();
    });
    shootBtn.addEventListener("click", () => shoot());

    let aimingPointer = false;
    canvas.addEventListener("pointerdown", (e) => {
      if (!canControl()) return;
      aimingPointer = true;
      canvas.setPointerCapture(e.pointerId);
      aimFromPointer(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!aimingPointer || !canControl()) return;
      aimFromPointer(e);
    });
    canvas.addEventListener("pointerup", (e) => {
      aimingPointer = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointercancel", () => { aimingPointer = false; });

    function makeBalls(count) {
      const out = [
        { id: "cue0", kind: "cue", player: 0, x: LEFT + 118, y: H / 2, vx: 0, vy: 0, r: CUE_R, color: "#ff5d73", active: true },
        { id: "cue1", kind: "cue", player: 1, x: RIGHT - 118, y: H / 2, vx: 0, vy: 0, r: CUE_R, color: "#4dd0e1", active: true },
      ];
      const spots = [
        [0, 0],
        [-22, -13], [-22, 13],
        [22, -13], [22, 13],
        [-44, 0], [44, 0],
        [0, -26], [0, 26],
        [-44, -26], [-44, 26],
      ];
      for (let i = 0; i < count; i++) {
        const s = spots[i % spots.length];
        out.push({
          id: "obj" + i,
          kind: "object",
          number: i + 1,
          x: W / 2 + s[0],
          y: H / 2 + s[1],
          vx: 0,
          vy: 0,
          r: BALL_R,
          color: OBJECT_COLORS[i % OBJECT_COLORS.length],
          active: true,
        });
      }
      return out;
    }

    function makeTokens(count, placedBalls) {
      const out = [];
      let guard = 0;
      while (out.length < count && guard++ < 500) {
        const x = LEFT + 86 + ctx.rng() * (RIGHT - LEFT - 172);
        const y = TOP + 70 + ctx.rng() * (BOTTOM - TOP - 140);
        if (POCKETS.some((p) => dist(x, y, p.x, p.y) < 78)) continue;
        if (placedBalls.some((b) => dist(x, y, b.x, b.y) < 54)) continue;
        if (out.some((t) => dist(x, y, t.x, t.y) < 62)) continue;
        const type = TOKEN_KEYS[Math.floor(ctx.rng() * TOKEN_KEYS.length)];
        out.push({ id: out.length, x, y, type, active: true, r: 14 });
      }
      return out;
    }

    function canControl() {
      return !busy && !over && (!ctx.isOnline || turn === ctx.mySeat);
    }

    function aimFromPointer(e) {
      const p = pointerPos(e);
      const cue = cueBall(turn);
      if (!cue || !cue.active) return;
      const dx = p.x - cue.x;
      const dy = p.y - cue.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) return;
      players[turn].angle = normalizeDeg(Math.atan2(dy, dx) * 180 / Math.PI);
      players[turn].power = clamp(Math.round(d / 2.4), 20, 100);
      syncControls();
      draw();
    }

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    function shoot() {
      if (!canControl()) return;
      const pl = players[turn];
      applyMove({ angle: pl.angle, power: pl.power, mode: selectedMode }, false);
    }

    function applyMove(move, fromRemote) {
      if (busy || over) return;
      if (!fromRemote && !canControl()) return;
      const pl = players[turn];
      pl.angle = normalizeDeg(Number(move.angle || 0));
      pl.power = clamp(Number(move.power || 60), 20, 100);

      let mode = MODE_DEFS[move.mode] ? move.mode : "normal";
      if (mode !== "normal") {
        if (!fromRemote && inventory[turn][mode] <= 0) mode = "normal";
        else inventory[turn][mode] = Math.max(0, inventory[turn][mode] - 1);
      }
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ angle: pl.angle, power: pl.power, mode });
      startShot(mode);
    }

    function startShot(mode) {
      const cue = cueBall(turn);
      if (!cue.active) respawnCue(turn);
      const pl = players[turn];
      const rad = pl.angle * Math.PI / 180;
      const speed = pl.power * POWER_SCALE;
      cue.vx += Math.cos(rad) * speed;
      cue.vy += Math.sin(rad) * speed;
      shot = {
        owner: turn,
        mode,
        frames: 0,
        bombReady: mode === "bomb",
        gravityAngle: rad,
        scored: 0,
        foul: false,
        opponentCue: false,
        pocketed: [],
        gained: [],
        blast: null,
      };
      busy = true;
      settledFrames = 0;
      selectedMode = "normal";
      last = mode === "normal"
        ? `Người chơi ${turn + 1} chọc bi.`
        : `Người chơi ${turn + 1} dùng ${MODE_DEFS[mode].label}.`;
      ctx.sound(mode === "normal" ? "shot" : "capture");
      renderHud();
      syncControls();
      updateStatus();
    }

    function stepPhysics() {
      if (!shot) return;
      shot.frames++;
      for (let i = 0; i < SUBSTEPS; i++) {
        applyShotForces();
        balls.forEach(moveBall);
        balls.forEach(resolvePocketAndRails);
        resolveCollisions();
        collectTokens();
      }

      if (shot.blast) {
        shot.blast.r += 5;
        if (shot.blast.r >= shot.blast.max) shot.blast = null;
      }

      if (allStopped()) settledFrames++;
      else settledFrames = 0;
      if (settledFrames > 18 || shot.frames > MAX_FRAMES) endShot();
    }

    function applyShotForces() {
      if (!shot) return;
      if (shot.mode === "magnet") {
        const cue = cueBall(shot.owner);
        if (cue && cue.active) {
          balls.forEach((b) => {
            if (!b.active || b.kind !== "object") return;
            const dx = cue.x - b.x;
            const dy = cue.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d <= 1 || d > 175) return;
            const pull = 0.022 * (1 - d / 175) / SUBSTEPS;
            b.vx += dx / d * pull;
            b.vy += dy / d * pull;
          });
        }
      } else if (shot.mode === "gravity") {
        const ax = Math.cos(shot.gravityAngle) * 0.032 / SUBSTEPS;
        const ay = Math.sin(shot.gravityAngle) * 0.032 / SUBSTEPS;
        balls.forEach((b) => {
          if (!b.active) return;
          if (speedOf(b) > 0.02) {
            b.vx += ax;
            b.vy += ay;
          }
        });
      }
    }

    function moveBall(b) {
      if (!b.active) return;
      b.x += b.vx / SUBSTEPS;
      b.y += b.vy / SUBSTEPS;
      const f = Math.pow(friction, 1 / SUBSTEPS);
      b.vx *= f;
      b.vy *= f;
      if (Math.abs(b.vx) < STOP_SPEED && Math.abs(b.vy) < STOP_SPEED) {
        b.vx = 0;
        b.vy = 0;
      }
    }

    function resolvePocketAndRails(b) {
      if (!b.active) return;
      const pocket = POCKETS.find((p) => dist(b.x, b.y, p.x, p.y) < POCKET_R);
      if (pocket) {
        pocketBall(b);
        return;
      }
      if (b.x < LEFT + b.r) {
        b.x = LEFT + b.r;
        b.vx = Math.abs(b.vx) * CUSHION;
      } else if (b.x > RIGHT - b.r) {
        b.x = RIGHT - b.r;
        b.vx = -Math.abs(b.vx) * CUSHION;
      }
      if (b.y < TOP + b.r) {
        b.y = TOP + b.r;
        b.vy = Math.abs(b.vy) * CUSHION;
      } else if (b.y > BOTTOM - b.r) {
        b.y = BOTTOM - b.r;
        b.vy = -Math.abs(b.vy) * CUSHION;
      }
    }

    function pocketBall(b) {
      b.active = false;
      b.vx = 0;
      b.vy = 0;
      if (!shot) return;
      if (b.kind === "object") {
        scores[turn] += 1;
        shot.scored += 1;
        shot.pocketed.push(b.number);
        ctx.sound("capture");
      } else if (b.kind === "cue") {
        if (b.player === turn) {
          shot.foul = true;
        } else {
          scores[turn] += 1;
          shot.opponentCue = true;
        }
        ctx.sound("miss");
      }
      renderHud();
    }

    function resolveCollisions() {
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (!a.active) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (!b.active) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          const min = a.r + b.r;
          if (d >= min || d <= 0) continue;
          const nx = dx / d;
          const ny = dy / d;
          const overlap = (min - d) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel > 0) {
            const impulse = rel * 0.98;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
            ctx.sound("place");
          }

          const currentCue = cueBall(turn);
          if (shot && shot.bombReady && currentCue && (a === currentCue || b === currentCue)) {
            shot.bombReady = false;
            explode((a.x + b.x) / 2, (a.y + b.y) / 2);
          }
        }
      }
    }

    function explode(x, y) {
      if (!shot) return;
      shot.blast = { x, y, r: 8, max: 96 };
      balls.forEach((b) => {
        if (!b.active) return;
        const dx = b.x - x;
        const dy = b.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 124) return;
        const force = 7.6 * (1 - d / 124);
        b.vx += dx / d * force;
        b.vy += dy / d * force;
      });
      ctx.sound("capture");
    }

    function collectTokens() {
      if (!shot) return;
      tokens.forEach((t) => {
        if (!t.active) return;
        const touched = balls.some((b) => b.active && dist(b.x, b.y, t.x, t.y) < b.r + t.r);
        if (!touched) return;
        t.active = false;
        inventory[turn][t.type] += 1;
        shot.gained.push(t.type);
        ctx.sound("select");
        renderHud();
      });
    }

    function endShot() {
      balls.forEach((b) => { b.vx = 0; b.vy = 0; });
      if (shot && shot.foul) scores[1 - turn] += 1;
      respawnCue(0);
      respawnCue(1);

      if (shot) {
        const bits = [];
        if (shot.pocketed.length) bits.push(`ăn ${shot.pocketed.length} bi`);
        if (shot.opponentCue) bits.push("đẩy bi chủ đối thủ xuống hố");
        if (shot.foul) bits.push("lỗi bi chủ, đối thủ +1");
        if (shot.gained.length) bits.push(`nhặt ${shot.gained.length} power-up`);
        last = bits.length ? `Người chơi ${turn + 1} ${bits.join(", ")}.` : `Người chơi ${turn + 1} chưa ăn được bi.`;
      }

      busy = false;
      shot = null;
      renderHud();

      if (checkEnd()) {
        syncControls();
        draw();
        return;
      }

      turn = 1 - turn;
      normalizeSelectedMode();
      ctx.setTurn(turn);
      updateStatus();
      syncControls();
      draw();
    }

    function checkEnd() {
      const noObjects = balls.every((b) => b.kind !== "object" || !b.active);
      if (scores[0] < TARGET && scores[1] < TARGET && !noObjects) return false;
      over = true;
      ctx.setTurn(-1);
      if (scores[0] === scores[1]) {
        ctx.setStatus(`🤝 Hòa ${scores[0]}-${scores[1]}!`);
        return true;
      }
      const winner = scores[0] > scores[1] ? 0 : 1;
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng Pool Battle ${scores[0]}-${scores[1]}!`);
      return true;
    }

    function respawnCue(player) {
      const cue = cueBall(player);
      if (!cue || cue.active) return;
      const home = player === 0
        ? { x: LEFT + 118, y: H / 2 }
        : { x: RIGHT - 118, y: H / 2 };
      const offsets = [
        [0, 0], [0, -32], [0, 32], [32, 0], [-32, 0],
        [42, -30], [-42, 30], [42, 30], [-42, -30],
      ];
      let spot = home;
      for (const [ox, oy] of offsets) {
        const x = clamp(home.x + ox, LEFT + cue.r, RIGHT - cue.r);
        const y = clamp(home.y + oy, TOP + cue.r, BOTTOM - cue.r);
        const blocked = balls.some((b) => b !== cue && b.active && dist(x, y, b.x, b.y) < b.r + cue.r + 4);
        if (!blocked) { spot = { x, y }; break; }
      }
      cue.x = spot.x;
      cue.y = spot.y;
      cue.vx = 0;
      cue.vy = 0;
      cue.active = true;
    }

    function cueBall(player) {
      return balls.find((b) => b.kind === "cue" && b.player === player);
    }

    function allStopped() {
      return balls.every((b) => !b.active || speedOf(b) <= STOP_SPEED);
    }

    function speedOf(b) {
      return Math.hypot(b.vx, b.vy);
    }

    function renderHud() {
      hud.innerHTML = `
        ${playerHud(0)}
        <div class="pool-mid">
          <b>${over ? "Kết thúc" : busy ? "Bi đang lăn" : "Lượt Người chơi " + (turn + 1)}</b>
          <span>Đích ${TARGET} điểm · Còn ${activeObjects()} bi</span>
          <small>${last}</small>
        </div>
        ${playerHud(1)}
      `;
    }

    function playerHud(idx) {
      const inv = inventory[idx];
      return `
        <div class="pool-player p${idx + 1} ${idx === turn && !over ? "active" : ""}">
          <span>Người chơi ${idx + 1}</span>
          <b>${scores[idx]} điểm</b>
          <em>
            <i class="pool-mini bomb">B</i>${inv.bomb}
            <i class="pool-mini magnet">M</i>${inv.magnet}
            <i class="pool-mini gravity">G</i>${inv.gravity}
          </em>
        </div>
      `;
    }

    function syncControls() {
      normalizeSelectedMode();
      const pl = players[turn];
      angleInput.value = pl.angle;
      powerInput.value = pl.power;
      syncControlLabels();
      const lock = !canControl();
      angleInput.disabled = lock;
      powerInput.disabled = lock;
      shootBtn.disabled = lock;
      modeBox.querySelectorAll(".pool-mode").forEach((btn) => {
        const id = btn.dataset.mode;
        const disabled = lock || (id !== "normal" && inventory[turn][id] <= 0);
        btn.disabled = disabled;
        btn.classList.toggle("active", id === selectedMode);
      });
    }

    function syncControlLabels() {
      angleVal.textContent = Math.round(players[turn].angle) + "°";
      powerVal.textContent = Math.round(players[turn].power);
    }

    function normalizeSelectedMode() {
      if (selectedMode !== "normal" && inventory[turn][selectedMode] <= 0) selectedMode = "normal";
    }

    function updateStatus() {
      if (over) return;
      if (busy) {
        ctx.setStatus("Bi đang lăn, chờ bàn dừng lại.");
      } else if (ctx.isOnline && turn !== ctx.mySeat) {
        ctx.setStatus(`Đối thủ đang ngắm. ${last}`);
      } else {
        ctx.setStatus(`Người chơi ${turn + 1}: kéo trên bàn hoặc chỉnh hướng/lực, chọn power-up rồi chọc bi.`);
      }
    }

    function activeObjects() {
      return balls.filter((b) => b.kind === "object" && b.active).length;
    }

    function draw() {
      drawTable();
      tokens.forEach(drawToken);
      balls.forEach(drawBall);
      drawAim();
      drawShotEffects();
    }

    function drawTable() {
      g.clearRect(0, 0, W, H);
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#12182e");
      bg.addColorStop(1, "#0a1020");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);

      roundedRect(g, LEFT - 32, TOP - 32, RIGHT - LEFT + 64, BOTTOM - TOP + 64, 26);
      const rail = g.createLinearGradient(LEFT, TOP - 32, RIGHT, BOTTOM + 32);
      rail.addColorStop(0, "#6f3f2a");
      rail.addColorStop(0.48, "#2f5d5a");
      rail.addColorStop(1, "#2b2537");
      g.fillStyle = rail;
      g.fill();

      roundedRect(g, LEFT, TOP, RIGHT - LEFT, BOTTOM - TOP, 16);
      const felt = g.createLinearGradient(LEFT, TOP, RIGHT, BOTTOM);
      felt.addColorStop(0, "#12745d");
      felt.addColorStop(0.52, "#0f604f");
      felt.addColorStop(1, "#154c59");
      g.fillStyle = felt;
      g.fill();

      g.strokeStyle = "rgba(255,255,255,0.1)";
      g.lineWidth = 1;
      for (let x = LEFT + 70; x < RIGHT; x += 70) {
        g.beginPath();
        g.moveTo(x, TOP + 12);
        g.lineTo(x - 18, BOTTOM - 12);
        g.stroke();
      }

      POCKETS.forEach((p) => {
        const pocket = g.createRadialGradient(p.x - 4, p.y - 5, 2, p.x, p.y, POCKET_R + 8);
        pocket.addColorStop(0, "#04050a");
        pocket.addColorStop(1, "#10172a");
        g.fillStyle = pocket;
        g.beginPath();
        g.arc(p.x, p.y, POCKET_R + 4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.12)";
        g.stroke();
      });

      g.fillStyle = "rgba(255,255,255,0.55)";
      g.font = "700 12px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.fillText("POOL BATTLE", W / 2, TOP - 16);
      g.textAlign = "left";
    }

    function drawToken(t) {
      if (!t.active) return;
      const def = TOKEN_DEFS[t.type];
      g.save();
      g.translate(t.x, t.y);
      g.rotate(Math.PI / 4);
      g.fillStyle = "rgba(0,0,0,0.26)";
      roundedRect(g, -15, -15, 30, 30, 7);
      g.fill();
      g.fillStyle = def.color;
      roundedRect(g, -12, -12, 24, 24, 6);
      g.fill();
      g.restore();
      g.fillStyle = "#101422";
      g.font = "900 14px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(def.letter, t.x, t.y + 1);
      g.textBaseline = "alphabetic";
    }

    function drawBall(b) {
      if (!b.active) return;
      g.save();
      g.shadowColor = "rgba(0,0,0,0.35)";
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
      const grad = g.createRadialGradient(b.x - 4, b.y - 5, 2, b.x, b.y, b.r + 3);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.22, b.kind === "cue" ? "#f7f7ff" : b.color);
      grad.addColorStop(1, shade(b.kind === "cue" ? b.color : b.color, -35));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;

      if (b.kind === "cue") {
        g.strokeStyle = b.color;
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = "#101422";
        g.font = "900 10px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("P" + (b.player + 1), b.x, b.y + 0.5);
      } else {
        g.fillStyle = "rgba(255,255,255,0.92)";
        g.beginPath();
        g.arc(b.x, b.y, 5.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#111827";
        g.font = "800 7px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(b.number), b.x, b.y + 0.3);
      }
      g.restore();
      g.textBaseline = "alphabetic";
    }

    function drawAim() {
      if (busy || over) return;
      const cue = cueBall(turn);
      if (!cue || !cue.active) return;
      const pl = players[turn];
      const rad = pl.angle * Math.PI / 180;
      const len = 70 + pl.power * 1.25;
      const tx = cue.x + Math.cos(rad) * len;
      const ty = cue.y + Math.sin(rad) * len;
      g.save();
      g.strokeStyle = pl.color;
      g.lineWidth = 3;
      g.setLineDash([12, 9]);
      g.beginPath();
      g.moveTo(cue.x, cue.y);
      g.lineTo(tx, ty);
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = "rgba(255,255,255,0.72)";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cue.x - Math.cos(rad) * 18, cue.y - Math.sin(rad) * 18);
      g.lineTo(cue.x - Math.cos(rad) * 86, cue.y - Math.sin(rad) * 86);
      g.stroke();
      g.fillStyle = pl.color;
      g.beginPath();
      g.arc(tx, ty, 5, 0, Math.PI * 2);
      g.fill();
      if (selectedMode !== "normal") {
        g.fillStyle = TOKEN_DEFS[selectedMode].color;
        g.font = "800 13px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(MODE_DEFS[selectedMode].label, cue.x, cue.y - 28);
      }
      g.restore();
    }

    function drawShotEffects() {
      if (!shot) return;
      if (shot.mode === "magnet") {
        const cue = cueBall(shot.owner);
        if (cue && cue.active) {
          g.strokeStyle = "rgba(139,230,240,0.2)";
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cue.x, cue.y, 175, 0, Math.PI * 2);
          g.stroke();
        }
      }
      if (shot.mode === "gravity") {
        const cx = W / 2;
        const cy = TOP + 32;
        g.strokeStyle = "rgba(255,209,102,0.8)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(cx - Math.cos(shot.gravityAngle) * 34, cy - Math.sin(shot.gravityAngle) * 34);
        g.lineTo(cx + Math.cos(shot.gravityAngle) * 34, cy + Math.sin(shot.gravityAngle) * 34);
        g.stroke();
      }
      if (shot.blast) {
        g.strokeStyle = `rgba(255,159,93,${Math.max(0, 1 - shot.blast.r / shot.blast.max)})`;
        g.lineWidth = 5;
        g.beginPath();
        g.arc(shot.blast.x, shot.blast.y, shot.blast.r, 0, Math.PI * 2);
        g.stroke();
      }
    }

    function loop() {
      if (busy) stepPhysics();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function roundedRect(gc, x, y, w, h, r) {
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

    function shade(hex, amount) {
      const n = parseInt(hex.slice(1), 16);
      const r = clamp(((n >> 16) & 255) + amount, 0, 255);
      const g2 = clamp(((n >> 8) & 255) + amount, 0, 255);
      const b = clamp((n & 255) + amount, 0, 255);
      return `rgb(${r},${g2},${b})`;
    }

    function normalizeDeg(n) {
      return ((Math.round(n) % 360) + 360) % 360;
    }

    function clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    }

    function dist(x1, y1, x2, y2) {
      return Math.hypot(x1 - x2, y1 - y2);
    }

    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        cancelAnimationFrame(raf);
        observer.disconnect();
      }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    ctx.setTurn(0);
    renderHud();
    syncControls();
    updateStatus();
    draw();
    raf = requestAnimationFrame(loop);
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "poolbattle",
    name: "Pool Battle",
    emoji: "🎱",
    description: "Bi-a đối kháng mini: chọc bi theo lượt, ăn điểm qua hố và dùng bóng nổ, nam châm, đổi trọng lực.",
    onlineReady: true,
    options: [
      {
        id: "target",
        label: "Điểm để thắng",
        default: 7,
        choices: [
          { value: 5, label: "5 điểm (nhanh)" },
          { value: 7, label: "7 điểm" },
          { value: 9, label: "9 điểm" },
        ],
      },
      {
        id: "balls",
        label: "Số bi trên bàn",
        default: 9,
        choices: [
          { value: 7, label: "7 bi" },
          { value: 9, label: "9 bi" },
          { value: 11, label: "11 bi" },
        ],
      },
      {
        id: "powerups",
        label: "Power-up trên bàn",
        default: 6,
        choices: [
          { value: 0, label: "Tắt" },
          { value: 6, label: "Vừa" },
          { value: 10, label: "Nhiều" },
        ],
      },
      {
        id: "cloth",
        label: "Mặt bàn",
        default: "normal",
        choices: [
          { value: "heavy", label: "Chậm" },
          { value: "normal", label: "Vừa" },
          { value: "fast", label: "Trơn" },
        ],
      },
    ],
    howTo: [
      "Mỗi người có một bi chủ riêng: Người chơi 1 màu đỏ, Người chơi 2 màu xanh. Đến lượt thì chọc bi chủ của mình.",
      "Kéo trực tiếp trên bàn để ngắm nhanh, hoặc dùng thanh Hướng và Lực. Bấm Chọc bi để đánh.",
      "Bi màu rơi vào hố sẽ cộng 1 điểm cho người vừa chọc. Đủ điểm mục tiêu thì thắng.",
      "Nếu làm rơi bi chủ của mình, đó là lỗi và đối thủ được 1 điểm. Nếu làm rơi bi chủ đối thủ, bạn được 1 điểm.",
      "Power-up Bóng nổ tạo lực nổ ở va chạm đầu tiên của bi chủ. Nam châm hút bi màu gần bi chủ trong cú đánh. Đổi trọng lực nghiêng bàn theo hướng đang ngắm.",
      "Các ô B, M, G trên bàn là power-up có thể nhặt khi bi chạm vào. Chơi online: mỗi lượt chỉ gửi hướng, lực và power-up, hai máy tự mô phỏng cùng kết quả.",
    ],
    create,
  });
})();
