/* Base Defense Duel - tower defense doi khang realtime nhe. */
(function () {
  const W = 840;
  const H = 500;
  const LANES = [182, 268, 354];
  const BASE_X = [98, W - 98];
  const SPAWN_X = [145, W - 145];
  const TOWER_X = [252, W - 252];
  const MAX_TOWER_LVL = 4;

  const UNIT_DEFS = {
    grunt: {
      label: "Lính nhỏ",
      icon: "MIN",
      cost: 22,
      hp: 62,
      dmg: 10,
      speed: 31,
      cd: 0.72,
      range: 20,
      reward: 7,
      color: "#ffd166",
      hint: "rẻ, đẩy lane",
    },
    runner: {
      label: "Kẻ chạy",
      icon: "RUN",
      cost: 36,
      hp: 48,
      dmg: 12,
      speed: 52,
      cd: 0.58,
      range: 18,
      reward: 9,
      color: "#8be6f0",
      hint: "nhanh",
    },
    brute: {
      label: "Quái trâu",
      icon: "TANK",
      cost: 64,
      hp: 142,
      dmg: 23,
      speed: 21,
      cd: 1.05,
      range: 24,
      reward: 14,
      color: "#ff9f5d",
      hint: "nhiều máu",
    },
    warlock: {
      label: "Pháp sư",
      icon: "HEX",
      cost: 88,
      hp: 82,
      dmg: 19,
      speed: 28,
      cd: 0.9,
      range: 74,
      reward: 18,
      color: "#c792ea",
      hint: "đánh xa",
    },
  };

  function create(ctx) {
    const o = ctx.options || {};
    const BASE_HP = o.hp || 700;
    const START_GOLD = o.gold || 130;
    const pace = o.pace || "normal";
    const INCOME_BASE = pace === "fast" ? 12 : pace === "slow" ? 7 : 9;
    const SCALING = o.scaling === "hard" ? 0.34 : o.scaling === "soft" ? 0.16 : 0.24;

    const baseHp = [BASE_HP, BASE_HP];
    const gold = [START_GOLD, START_GOLD];
    const incomeLvl = [0, 0];
    const armoryLvl = [0, 0];
    const towers = [
      [null, null, null],
      [null, null, null],
    ];
    const units = [];
    const bullets = [];
    const pops = [];

    let controlSide = ctx.isOnline ? ctx.mySeat : 0;
    let selectedLane = [1, 1];
    let elapsed = 0;
    let lastTime = 0;
    let over = false;
    let raf = null;
    let last = "Gửi quái để ép lane, xây tháp để thủ nhà.";

    const root = document.createElement("div");
    root.className = "bd-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "bd-hud";
    root.appendChild(hud);

    const arena = document.createElement("div");
    arena.className = "bd-arena";
    root.appendChild(arena);

    const attackPanel = document.createElement("div");
    attackPanel.className = "bd-command-panel bd-attack-panel";
    attackPanel.innerHTML = `
      <div class="bd-panel-head">
        <b>Tấn công</b>
        <span>Gửi quái sang lane đối thủ</span>
      </div>
      <div class="bd-action-group bd-attack-actions"></div>
    `;
    arena.appendChild(attackPanel);

    const centerCol = document.createElement("div");
    centerCol.className = "bd-center-col";
    arena.appendChild(centerCol);

    const stageWrap = document.createElement("div");
    stageWrap.className = "bd-stage-wrap";
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "bd-canvas";
    stageWrap.appendChild(canvas);
    centerCol.appendChild(stageWrap);
    const g = canvas.getContext("2d");

    function fitCanvas() {
      const viewport = Math.max(280, window.innerWidth - 32);
      const boardW = centerCol.getBoundingClientRect().width || ctx.boardEl.getBoundingClientRect().width || viewport;
      const width = Math.max(280, Math.min(W, viewport, boardW));
      canvas.style.width = width + "px";
      canvas.style.height = Math.round(width * H / W) + "px";
      stageWrap.style.width = width + "px";
    }
    window.addEventListener("resize", fitCanvas);

    const controls = document.createElement("div");
    controls.className = "bd-controls bd-center-controls";
    controls.innerHTML = `
      <div class="bd-sidebox"></div>
      <div class="bd-lanes"></div>
    `;
    centerCol.appendChild(controls);

    const defensePanel = document.createElement("div");
    defensePanel.className = "bd-command-panel bd-defense-panel";
    defensePanel.innerHTML = `
      <div class="bd-panel-head">
        <b>Phòng thủ</b>
        <span>Tháp, sửa nhà và nâng cấp</span>
      </div>
      <div class="bd-group-title">Tháp & nhà chính</div>
      <div class="bd-action-group bd-defense-actions"></div>
      <div class="bd-group-title">Kinh tế & sức mạnh</div>
      <div class="bd-action-group bd-upgrade-actions"></div>
    `;
    arena.appendChild(defensePanel);

    const sideBox = controls.querySelector(".bd-sidebox");
    const laneBox = controls.querySelector(".bd-lanes");
    const attackBox = attackPanel.querySelector(".bd-attack-actions");
    const defenseBox = defensePanel.querySelector(".bd-defense-actions");
    const upgradeBox = defensePanel.querySelector(".bd-upgrade-actions");

    const attackActions = [
      { id: "grunt", kind: "unit", def: UNIT_DEFS.grunt },
      { id: "runner", kind: "unit", def: UNIT_DEFS.runner },
      { id: "brute", kind: "unit", def: UNIT_DEFS.brute },
      { id: "warlock", kind: "unit", def: UNIT_DEFS.warlock },
    ];
    const defenseActions = [
      { id: "tower", label: "Xây tháp", icon: "TWR", hint: "lane đã chọn" },
      { id: "upTower", label: "Nâng tháp", icon: "UP", hint: "tối đa 4" },
      { id: "repair", label: "Sửa nhà", icon: "FIX", hint: "+90 HP" },
    ];
    const upgradeActions = [
      { id: "econ", label: "Kinh tế", icon: "GOLD", hint: "+vàng/giây" },
      { id: "armory", label: "Lò rèn", icon: "DMG", hint: "+quân/tháp" },
    ];

    function renderStaticControls() {
      sideBox.innerHTML = "";
      if (ctx.isOnline) {
        const label = document.createElement("div");
        label.className = "bd-online-side";
        label.innerHTML = `<b>Bạn: Người chơi ${ctx.mySeat + 1}</b><span>Điều khiển phe ${ctx.mySeat === 0 ? "đỏ" : "xanh"}</span>`;
        sideBox.appendChild(label);
      } else {
        [0, 1].forEach((side) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn small bd-side-btn";
          btn.dataset.side = String(side);
          btn.textContent = "P" + (side + 1);
          btn.addEventListener("click", () => {
            controlSide = side;
            ctx.setTurn(controlSide);
            syncControls();
            draw();
          });
          sideBox.appendChild(btn);
        });
      }

      laneBox.innerHTML = "";
      LANES.forEach((_, lane) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn small bd-lane-btn";
        btn.dataset.lane = String(lane);
        btn.innerHTML = `<b>Lane ${lane + 1}</b><small>${lane === 0 ? "trên" : lane === 1 ? "giữa" : "dưới"}</small>`;
        btn.addEventListener("click", () => {
          selectedLane[controlSide] = lane;
          syncControls();
          draw();
        });
        laneBox.appendChild(btn);
      });

      attackBox.innerHTML = "";
      defenseBox.innerHTML = "";
      upgradeBox.innerHTML = "";
      [
        [attackActions, attackBox],
        [defenseActions, defenseBox],
        [upgradeActions, upgradeBox],
      ].forEach(([list, box]) => {
        list.forEach((a) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn small bd-action";
          btn.dataset.action = a.id;
          const label = a.def ? a.def.label : a.label;
          const icon = a.def ? a.def.icon : a.icon;
          const hint = a.def ? a.def.hint : a.hint;
          btn.innerHTML = `<span>${icon}</span><b>${label}</b><small>${hint}</small><em></em>`;
          btn.addEventListener("click", () => submitAction(a.id));
          box.appendChild(btn);
        });
      });
    }

    canvas.addEventListener("click", (e) => {
      if (over) return;
      const p = pointerPos(e);
      const lane = nearestLane(p.y);
      if (lane !== -1) selectedLane[controlSide] = lane;
      if (!ctx.isOnline) {
        controlSide = p.x < W / 2 ? 0 : 1;
        ctx.setTurn(controlSide);
      }
      syncControls();
      draw();
    });

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    }

    function nearestLane(y) {
      let best = -1, bestD = 999;
      LANES.forEach((ly, i) => {
        const d = Math.abs(y - ly);
        if (d < bestD) { best = i; bestD = d; }
      });
      return bestD <= 48 ? best : -1;
    }

    function submitAction(action) {
      if (over) return;
      const side = ctx.isOnline ? ctx.mySeat : controlSide;
      if (ctx.isOnline && side !== ctx.mySeat) return;
      const lane = selectedLane[side];
      const cmd = { kind: "bd", action, lane };
      if (applyCommand(cmd, false) && ctx.isOnline) ctx.sendMove(cmd);
    }

    function applyMove(move, fromRemote) {
      if (!move || move.kind !== "bd") return;
      applyCommand(move, fromRemote);
    }

    function applyCommand(cmd, fromRemote) {
      if (over) return false;
      const side = ctx.isOnline
        ? (fromRemote ? 1 - ctx.mySeat : ctx.mySeat)
        : controlSide;
      const lane = clamp(Number(cmd.lane), 0, 2);
      const force = fromRemote && ctx.isOnline;
      let ok = false;

      if (UNIT_DEFS[cmd.action]) ok = buyUnit(side, lane, cmd.action, force);
      else if (cmd.action === "tower") ok = buildTower(side, lane, force);
      else if (cmd.action === "upTower") ok = upgradeTower(side, lane, force);
      else if (cmd.action === "econ") ok = upgradeEconomy(side, force);
      else if (cmd.action === "armory") ok = upgradeArmory(side, force);
      else if (cmd.action === "repair") ok = repairBase(side, force);

      if (ok) {
        selectedLane[side] = lane;
        renderHud();
        syncControls();
        updateStatus();
      }
      return ok;
    }

    function buyUnit(side, lane, type, force) {
      const def = UNIT_DEFS[type];
      if (!spend(side, def.cost, force)) return false;
      spawnUnit(side, lane, type);
      last = `Người chơi ${side + 1} gửi ${def.label} vào lane ${lane + 1}.`;
      ctx.sound("select");
      return true;
    }

    function buildTower(side, lane, force) {
      if (towers[side][lane]) return false;
      const cost = towerBuildCost(side);
      if (!spend(side, cost, force)) return false;
      towers[side][lane] = { lvl: 1, cd: 0, pulse: 20 };
      last = `Người chơi ${side + 1} xây tháp lane ${lane + 1}.`;
      ctx.sound("capture");
      return true;
    }

    function upgradeTower(side, lane, force) {
      const tw = towers[side][lane];
      if (!tw || tw.lvl >= MAX_TOWER_LVL) return false;
      const cost = towerUpgradeCost(tw);
      if (!spend(side, cost, force)) return false;
      tw.lvl += 1;
      tw.pulse = 28;
      last = `Người chơi ${side + 1} nâng tháp lane ${lane + 1} lên cấp ${tw.lvl}.`;
      ctx.sound("capture");
      return true;
    }

    function upgradeEconomy(side, force) {
      const cost = econCost(side);
      if (!spend(side, cost, force)) return false;
      incomeLvl[side] += 1;
      last = `Người chơi ${side + 1} nâng kinh tế lên cấp ${incomeLvl[side]}.`;
      ctx.sound("select");
      return true;
    }

    function upgradeArmory(side, force) {
      const cost = armoryCost(side);
      if (!spend(side, cost, force)) return false;
      armoryLvl[side] += 1;
      last = `Người chơi ${side + 1} nâng lò rèn lên cấp ${armoryLvl[side]}.`;
      ctx.sound("select");
      return true;
    }

    function repairBase(side, force) {
      const cost = repairCost(side);
      if (baseHp[side] >= BASE_HP) return false;
      if (!spend(side, cost, force)) return false;
      baseHp[side] = Math.min(BASE_HP, baseHp[side] + 90);
      last = `Người chơi ${side + 1} sửa nhà chính.`;
      ctx.sound("select");
      return true;
    }

    function spend(side, cost, force) {
      if (!force && gold[side] < cost) return false;
      gold[side] = Math.max(0, gold[side] - cost);
      return true;
    }

    function spawnUnit(owner, lane, type) {
      const def = UNIT_DEFS[type];
      const scale = unitScale(owner);
      const y = LANES[lane] + (ctx.rng() * 12 - 6);
      units.push({
        id: Math.random().toString(36).slice(2),
        owner,
        lane,
        type,
        x: SPAWN_X[owner],
        y,
        hp: Math.round(def.hp * scale),
        maxHp: Math.round(def.hp * scale),
        dmg: Math.round(def.dmg * (1 + armoryLvl[owner] * 0.13 + elapsed / 360 * SCALING)),
        speed: def.speed * (1 + elapsed / 520 * 0.08),
        cd: 0.18 + ctx.rng() * 0.24,
        flash: 16,
        phase: ctx.rng() * Math.PI * 2,
      });
      pops.push({ x: SPAWN_X[owner], y, text: "+" + def.label, color: def.color, t: 46 });
    }

    function update(dt) {
      if (over) return;
      elapsed += dt;
      for (let side = 0; side < 2; side++) gold[side] += incomeRate(side) * dt;
      updateUnits(dt);
      updateTowers(dt);
      updateEffects(dt);
      checkEnd();
      renderHud();
      syncControls();
      updateStatus();
    }

    function updateUnits(dt) {
      units.forEach((u) => {
        if (u.hp <= 0) return;
        u.flash = Math.max(0, u.flash - dt * 35);
        u.cd = Math.max(0, u.cd - dt);
        u.phase += dt * (u.speed * 0.18 + 4);
        const dir = u.owner === 0 ? 1 : -1;
        const enemy = closestEnemyInLane(u);
        const enemyBaseX = BASE_X[1 - u.owner];
        const def = UNIT_DEFS[u.type];
        const atBase = u.owner === 0 ? u.x >= enemyBaseX - 46 : u.x <= enemyBaseX + 46;

        if (enemy && Math.abs(enemy.x - u.x) <= def.range + 14) {
          if (u.cd <= 0) {
            damageUnit(enemy, u.dmg, u.owner, u.x, u.y);
            u.cd = def.cd;
          }
        } else if (atBase) {
          if (u.cd <= 0) {
            baseHp[1 - u.owner] = Math.max(0, baseHp[1 - u.owner] - u.dmg);
            pops.push({ x: enemyBaseX, y: LANES[u.lane] - 34, text: "-" + u.dmg, color: "#ff5d73", t: 44 });
            u.cd = def.cd;
            ctx.sound("shot");
          }
        } else {
          u.x += dir * u.speed * dt;
          const targetY = LANES[u.lane];
          u.y += (targetY - u.y) * Math.min(1, dt * 4);
        }
      });
      for (let i = units.length - 1; i >= 0; i--) {
        if (units[i].hp <= 0) units.splice(i, 1);
      }
    }

    function closestEnemyInLane(unit) {
      const dir = unit.owner === 0 ? 1 : -1;
      let best = null, bestD = 9999;
      units.forEach((other) => {
        if (other.owner === unit.owner || other.lane !== unit.lane || other.hp <= 0) return;
        const ahead = (other.x - unit.x) * dir;
        if (ahead < -8) return;
        if (ahead < bestD) { bestD = ahead; best = other; }
      });
      return best;
    }

    function damageUnit(unit, dmg, bySide, x, y) {
      unit.hp -= dmg;
      unit.flash = 16;
      pops.push({ x: unit.x, y: unit.y - 20, text: "-" + dmg, color: "#ffd166", t: 32 });
      if (unit.hp <= 0) {
        const reward = UNIT_DEFS[unit.type].reward;
        gold[bySide] += reward;
        pops.push({ x, y: y - 28, text: "+" + reward + "g", color: "#6ee7b7", t: 38 });
        ctx.sound("capture");
      } else {
        ctx.sound("place");
      }
    }

    function updateTowers(dt) {
      for (let side = 0; side < 2; side++) {
        for (let lane = 0; lane < 3; lane++) {
          const tw = towers[side][lane];
          if (!tw) continue;
          tw.cd = Math.max(0, tw.cd - dt);
          tw.pulse = Math.max(0, tw.pulse - dt * 35);
          if (tw.cd > 0) continue;
          const target = towerTarget(side, lane, tw);
          if (!target) continue;
          const dmg = Math.round((15 + tw.lvl * 8) * (1 + armoryLvl[side] * 0.1));
          tw.cd = Math.max(0.32, 0.95 - tw.lvl * 0.08);
          damageUnit(target, dmg, side, towerX(side), LANES[lane]);
          bullets.push({
            x1: towerX(side),
            y1: LANES[lane] - 54,
            x2: target.x,
            y2: target.y,
            color: side === 0 ? "#ff5d73" : "#4dd0e1",
            t: 18,
          });
        }
      }
    }

    function towerTarget(side, lane, tw) {
      const x = towerX(side);
      const y = LANES[lane] - 50;
      const range = 132 + tw.lvl * 22;
      let best = null, bestD = 9999;
      units.forEach((u) => {
        if (u.owner === side || u.hp <= 0) return;
        const d = dist(x, y, u.x, u.y);
        if (d <= range && d < bestD) { best = u; bestD = d; }
      });
      return best;
    }

    function updateEffects(dt) {
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].t -= dt * 60;
        if (bullets[i].t <= 0) bullets.splice(i, 1);
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t -= dt * 60;
        pops[i].y -= dt * 16;
        if (pops[i].t <= 0) pops.splice(i, 1);
      }
    }

    function checkEnd() {
      if (baseHp[0] > 0 && baseHp[1] > 0) return;
      over = true;
      ctx.setTurn(-1);
      if (baseHp[0] <= 0 && baseHp[1] <= 0) {
        ctx.setStatus("🤝 Hai nhà chính cùng sập - hòa!");
      } else {
        const winner = baseHp[0] <= 0 ? 1 : 0;
        ctx.incScore(winner);
        ctx.setStatus(`🎉 Người chơi ${winner + 1} phá nhà chính và thắng!`);
      }
    }

    function renderHud() {
      hud.innerHTML = `
        ${playerHud(0)}
        <div class="bd-mid">
          <b>${over ? "Kết thúc" : "Base Defense Duel"}</b>
          <span>${timeText()} · Sức quái x${unitScale(0).toFixed(2)}</span>
          <small>${last}</small>
        </div>
        ${playerHud(1)}
      `;
    }

    function playerHud(side) {
      const hpPct = Math.max(0, baseHp[side] / BASE_HP * 100);
      const towersBuilt = towers[side].filter(Boolean).length;
      return `
        <div class="bd-player p${side + 1} ${controlSide === side && !over ? "active" : ""}">
          <span>Người chơi ${side + 1}</span>
          <b>${Math.ceil(baseHp[side])}/${BASE_HP} HP</b>
          <em>${Math.floor(gold[side])} vàng · +${incomeRate(side).toFixed(1)}/s · ${towersBuilt}/3 tháp</em>
          <i class="bd-hp"><i style="width:${hpPct}%"></i></i>
          <small>Kinh tế ${incomeLvl[side]} · Lò rèn ${armoryLvl[side]}</small>
        </div>
      `;
    }

    function syncControls() {
      if (!root.isConnected) return;
      const side = ctx.isOnline ? ctx.mySeat : controlSide;
      if (!ctx.isOnline) {
        sideBox.querySelectorAll(".bd-side-btn").forEach((btn) => {
          btn.classList.toggle("active", Number(btn.dataset.side) === controlSide);
        });
      }
      laneBox.querySelectorAll(".bd-lane-btn").forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.lane) === selectedLane[side]);
      });
      root.querySelectorAll(".bd-action").forEach((btn) => {
        const id = btn.dataset.action;
        const cost = actionCost(side, id, selectedLane[side]);
        const label = cost === Infinity ? "không thể" : cost + " vàng";
        btn.querySelector("em").textContent = label;
        btn.disabled = over || (ctx.isOnline && side !== ctx.mySeat) || cost === Infinity || gold[side] < cost;
      });
    }

    function updateStatus() {
      if (over) return;
      const side = ctx.isOnline ? ctx.mySeat : controlSide;
      if (ctx.isOnline) {
        ctx.setStatus(`Bạn là Người chơi ${ctx.mySeat + 1}. Chọn lane, gửi quái, xây tháp và nâng cấp để phá nhà đối thủ.`);
      } else {
        ctx.setStatus(`Đang điều khiển Người chơi ${side + 1}. Click nửa sân để đổi phe, chọn lane rồi mua quân/tháp.`);
      }
      ctx.setTurn(side);
    }

    function actionCost(side, id, lane) {
      if (UNIT_DEFS[id]) return UNIT_DEFS[id].cost;
      if (id === "tower") return towers[side][lane] ? Infinity : towerBuildCost(side);
      if (id === "upTower") {
        const tw = towers[side][lane];
        return !tw || tw.lvl >= MAX_TOWER_LVL ? Infinity : towerUpgradeCost(tw);
      }
      if (id === "econ") return econCost(side);
      if (id === "armory") return armoryCost(side);
      if (id === "repair") return baseHp[side] >= BASE_HP ? Infinity : repairCost(side);
      return Infinity;
    }

    function towerBuildCost(side) {
      return 82 + towers[side].filter(Boolean).length * 26;
    }

    function towerUpgradeCost(tw) {
      return 68 + tw.lvl * 48;
    }

    function econCost(side) {
      return 84 + incomeLvl[side] * 58;
    }

    function armoryCost(side) {
      return 112 + armoryLvl[side] * 78;
    }

    function repairCost(side) {
      return 74 + Math.floor((BASE_HP - baseHp[side]) / 180) * 12;
    }

    function incomeRate(side) {
      return INCOME_BASE + incomeLvl[side] * 2.8 + elapsed / 180;
    }

    function unitScale(side) {
      return 1 + armoryLvl[side] * 0.12 + elapsed / 260 * SCALING;
    }

    function towerX(side) {
      return TOWER_X[side];
    }

    function timeText() {
      const m = Math.floor(elapsed / 60);
      const s = Math.floor(elapsed % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    function draw() {
      drawBackground();
      drawBases();
      drawTowers();
      drawUnits();
      drawEffects();
      drawSelection();
    }

    function drawBackground() {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#151936");
      sky.addColorStop(0.58, "#1f294d");
      sky.addColorStop(1, "#111629");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.ellipse(90 + i * 118, 78 + (i % 3) * 20, 45, 10, 0, 0, Math.PI * 2);
        g.fill();
      }

      LANES.forEach((y, lane) => {
        const band = g.createLinearGradient(0, y - 30, W, y + 30);
        band.addColorStop(0, "rgba(255,93,115,0.13)");
        band.addColorStop(0.5, "rgba(255,255,255,0.06)");
        band.addColorStop(1, "rgba(77,208,225,0.13)");
        g.fillStyle = band;
        roundRect(g, 68, y - 27, W - 136, 54, 999);
        g.fill();
        g.strokeStyle = lane === selectedLane[controlSide] ? "rgba(255,209,102,0.45)" : "rgba(255,255,255,0.09)";
        g.lineWidth = lane === selectedLane[controlSide] ? 2 : 1;
        g.stroke();
        g.fillStyle = "rgba(255,255,255,0.32)";
        g.font = "800 11px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText("LANE " + (lane + 1), W / 2, y + 4);
      });

      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(0, H - 48, W, 48);
      g.fillStyle = "rgba(255,255,255,0.72)";
      g.font = "900 12px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.fillText("BASE DEFENSE DUEL", W / 2, 28);
      g.textAlign = "left";
    }

    function drawBases() {
      [0, 1].forEach((side) => {
        const x = BASE_X[side];
        const color = side === 0 ? "#ff5d73" : "#4dd0e1";
        const hpPct = Math.max(0, baseHp[side] / BASE_HP);
        g.save();
        g.translate(x, 268);
        g.fillStyle = "rgba(0,0,0,0.32)";
        g.beginPath();
        g.ellipse(0, 112, 54, 13, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = side === 0 ? "#502b45" : "#224451";
        roundRect(g, -38, -64, 76, 142, 10);
        g.fill();
        g.fillStyle = color;
        roundRect(g, -30, -52, 60, 32, 8);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = -32; i <= 32; i += 32) g.fillRect(i - 5, -8, 10, 62);
        g.fillStyle = "#101422";
        g.font = "900 13px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText("P" + (side + 1), 0, -30);
        g.fillStyle = "rgba(0,0,0,0.42)";
        roundRect(g, -46, -86, 92, 9, 999);
        g.fill();
        g.fillStyle = hpPct > 0.32 ? "#6ee7b7" : "#ff5d73";
        roundRect(g, -46, -86, 92 * hpPct, 9, 999);
        g.fill();
        g.restore();
      });
    }

    function drawTowers() {
      [0, 1].forEach((side) => {
        LANES.forEach((y, lane) => {
          const x = towerX(side);
          const tw = towers[side][lane];
          const selected = controlSide === side && selectedLane[side] === lane;
          g.save();
          g.translate(x, y - 50);
          g.strokeStyle = selected ? "rgba(255,209,102,0.72)" : "rgba(255,255,255,0.18)";
          g.lineWidth = selected ? 3 : 1;
          g.setLineDash(tw ? [] : [6, 6]);
          roundRect(g, -24, -20, 48, 44, 8);
          g.stroke();
          g.setLineDash([]);
          if (tw) {
            const color = side === 0 ? "#ff5d73" : "#4dd0e1";
            g.fillStyle = "#2a3060";
            roundRect(g, -20, -18, 40, 40, 7);
            g.fill();
            g.fillStyle = color;
            g.beginPath();
            g.arc(0, -3, 13 + tw.lvl, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#101422";
            g.font = "900 10px Segoe UI, sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(String(tw.lvl), 0, -3);
            if (tw.pulse > 0) {
              g.strokeStyle = "rgba(255,209,102,0.45)";
              g.beginPath();
              g.arc(0, -3, 22 + tw.pulse * 0.6, 0, Math.PI * 2);
              g.stroke();
            }
          } else {
            g.fillStyle = "rgba(255,255,255,0.32)";
            g.font = "800 10px Segoe UI, sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText("+", 0, 1);
          }
          g.restore();
          g.textBaseline = "alphabetic";
        });
      });
    }

    function drawUnits() {
      units.forEach((u) => {
        if (u.hp <= 0) return;
        const def = UNIT_DEFS[u.type];
        const sideColor = u.owner === 0 ? "#ff5d73" : "#4dd0e1";
        const dir = u.owner === 0 ? 1 : -1;
        const body = u.flash > 0 ? "#ffffff" : def.color;
        const walk = Math.sin(u.phase);
        const stride = Math.cos(u.phase);
        g.save();
        g.translate(u.x, u.y);
        g.fillStyle = "rgba(0,0,0,0.28)";
        g.beginPath();
        g.ellipse(0, 18, u.type === "brute" ? 24 : 18, 6, 0, 0, Math.PI * 2);
        g.fill();
        g.scale(dir, 1);
        drawUnitLegs(walk, stride, sideColor, u.type === "brute" ? 1.18 : 1);
        if (u.type === "brute") drawBruteUnit(body, sideColor, walk);
        else if (u.type === "runner") drawRunnerUnit(body, sideColor, walk);
        else if (u.type === "warlock") drawWarlockUnit(body, sideColor, walk);
        else drawGruntUnit(body, sideColor, walk);
        g.restore();

        const pct = Math.max(0, u.hp / u.maxHp);
        g.save();
        g.translate(u.x, u.y);
        g.fillStyle = "rgba(0,0,0,0.48)";
        roundRect(g, -18, -34, 36, 5, 999);
        g.fill();
        g.fillStyle = pct > 0.35 ? "#6ee7b7" : "#ff5d73";
        roundRect(g, -18, -34, 36 * pct, 5, 999);
        g.fill();
        g.restore();
      });
    }

    function drawUnitLegs(walk, stride, color, scale) {
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(-7, 6);
      g.lineTo(-11 + walk * 5, 18 * scale);
      g.lineTo(-18 + walk * 6, 20 * scale);
      g.moveTo(7, 6);
      g.lineTo(12 - walk * 5, 18 * scale);
      g.lineTo(18 - walk * 6, 20 * scale);
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.22)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-5, 7);
      g.lineTo(-5 + stride * 4, 16 * scale);
      g.moveTo(5, 7);
      g.lineTo(5 - stride * 4, 16 * scale);
      g.stroke();
    }

    function drawGruntUnit(body, sideColor, walk) {
      g.fillStyle = body;
      roundRect(g, -12, -18, 24, 25, 8);
      g.fill();
      g.fillStyle = sideColor;
      roundRect(g, -9, -26, 18, 12, 6);
      g.fill();
      g.fillStyle = "#101422";
      g.fillRect(-6, -22, 12, 3);
      g.strokeStyle = "#d8dee9";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(12, -5);
      g.lineTo(23, -13 + walk * 2);
      g.stroke();
      g.fillStyle = "rgba(255,255,255,0.2)";
      roundRect(g, -18, -9, 9, 17, 4);
      g.fill();
    }

    function drawRunnerUnit(body, sideColor, walk) {
      g.save();
      g.rotate(-0.18);
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(-14, 9);
      g.quadraticCurveTo(-8, -18, 14, -12);
      g.quadraticCurveTo(20, -2, 8, 9);
      g.closePath();
      g.fill();
      g.strokeStyle = sideColor;
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = sideColor;
      g.beginPath();
      g.arc(13, -17, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#f8fafc";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-13, -6);
      g.lineTo(-23, -10 - walk * 4);
      g.moveTo(8, -3);
      g.lineTo(21, 4 + walk * 2);
      g.stroke();
      g.restore();
    }

    function drawBruteUnit(body, sideColor, walk) {
      g.fillStyle = "#2a3060";
      roundRect(g, -19, -25, 38, 36, 10);
      g.fill();
      g.fillStyle = body;
      roundRect(g, -15, -20, 30, 29, 8);
      g.fill();
      g.fillStyle = sideColor;
      roundRect(g, -13, -33, 26, 16, 8);
      g.fill();
      g.fillStyle = "#101422";
      g.fillRect(-8, -27, 16, 4);
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-18, -28);
      g.lineTo(-27, -36);
      g.moveTo(18, -28);
      g.lineTo(27, -36);
      g.stroke();
      g.strokeStyle = sideColor;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(-19, -8);
      g.lineTo(-29, 3 + walk * 2);
      g.moveTo(19, -8);
      g.lineTo(29, 3 - walk * 2);
      g.stroke();
    }

    function drawWarlockUnit(body, sideColor, walk) {
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(0, -31);
      g.lineTo(19, 12);
      g.lineTo(-19, 12);
      g.closePath();
      g.fill();
      g.strokeStyle = sideColor;
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = "#101422";
      g.beginPath();
      g.arc(0, -17, 8, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#c9a98a";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(17, -21);
      g.lineTo(28, 13);
      g.stroke();
      g.fillStyle = sideColor;
      g.beginPath();
      g.arc(17, -21, 5 + Math.max(0, walk) * 1.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.beginPath();
      g.arc(-7, -2, 4, 0, Math.PI * 2);
      g.arc(6, 5, 3, 0, Math.PI * 2);
      g.fill();
    }

    function drawEffects() {
      bullets.forEach((b) => {
        g.strokeStyle = b.color;
        g.globalAlpha = Math.max(0, b.t / 18);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(b.x1, b.y1);
        g.lineTo(b.x2, b.y2);
        g.stroke();
        g.globalAlpha = 1;
      });
      pops.forEach((p) => {
        g.globalAlpha = Math.max(0, p.t / 46);
        g.fillStyle = p.color;
        g.font = "800 12px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(p.text, p.x, p.y);
        g.globalAlpha = 1;
      });
    }

    function drawSelection() {
      const side = ctx.isOnline ? ctx.mySeat : controlSide;
      const lane = selectedLane[side];
      const y = LANES[lane];
      g.strokeStyle = "rgba(255,209,102,0.55)";
      g.lineWidth = 2;
      g.setLineDash([10, 8]);
      g.beginPath();
      g.moveTo(122, y);
      g.lineTo(W - 122, y);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = "rgba(255,209,102,0.9)";
      g.font = "900 12px Segoe UI, sans-serif";
      g.textAlign = "center";
      g.fillText(`Đang chọn P${side + 1} · Lane ${lane + 1}`, W / 2, y - 36);
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

    function dist(x1, y1, x2, y2) {
      return Math.hypot(x1 - x2, y1 - y2);
    }

    function clamp(n, min, max) {
      if (!Number.isFinite(n)) return min;
      return Math.max(min, Math.min(max, n));
    }

    function loop(ts) {
      if (!lastTime) lastTime = ts;
      const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0);
      lastTime = ts;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", fitCanvas);
        observer.disconnect();
      }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    renderStaticControls();
    fitCanvas();
    ctx.setTurn(controlSide);
    renderHud();
    syncControls();
    updateStatus();
    draw();
    raf = requestAnimationFrame(loop);
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "basedefenseduel",
    name: "Base Defense Duel",
    emoji: "🏰",
    description: "Vừa thủ nhà bằng tháp, vừa gửi quái sang phá nhà đối thủ. Vàng và sức quái tăng dần theo thời gian.",
    onlineReady: true,
    options: [
      {
        id: "hp",
        label: "Máu nhà chính",
        default: 700,
        choices: [
          { value: 500, label: "500 (nhanh)" },
          { value: 700, label: "700" },
          { value: 950, label: "950 (lâu)" },
        ],
      },
      {
        id: "gold",
        label: "Vàng ban đầu",
        default: 130,
        choices: [
          { value: 90, label: "90 (chậm)" },
          { value: 130, label: "130" },
          { value: 180, label: "180 (nhanh)" },
        ],
      },
      {
        id: "pace",
        label: "Nhịp vàng",
        default: "normal",
        choices: [
          { value: "slow", label: "Chậm" },
          { value: "normal", label: "Vừa" },
          { value: "fast", label: "Nhanh" },
        ],
      },
      {
        id: "scaling",
        label: "Sức quái late game",
        default: "normal",
        choices: [
          { value: "soft", label: "Nhẹ" },
          { value: "normal", label: "Vừa" },
          { value: "hard", label: "Mạnh" },
        ],
      },
    ],
    howTo: [
      "Hai bên có nhà chính ở hai đầu bản đồ. Mục tiêu là phá nhà chính đối thủ trước.",
      "Chọn lane 1, 2 hoặc 3 rồi gửi quái sang nhà đối thủ. Quái sẽ tự đi, đánh quái địch, rồi đánh nhà chính.",
      "Xây tháp trên lane để bắn quái địch. Mỗi lane mỗi bên có một vị trí tháp, có thể nâng cấp tối đa cấp 4.",
      "Nâng Kinh tế để tăng vàng mỗi giây. Nâng Lò rèn để tăng sức mạnh quái và sát thương tháp.",
      "Sửa nhà dùng vàng để hồi máu nhà chính khi bị ép.",
      "Càng về sau quái càng mạnh, nên ván có thể kéo dài và chuyển sang giai đoạn late game rất căng.",
      "Chơi chung máy: click nửa sân hoặc nút P1/P2 để đổi phe điều khiển. Chơi online: mỗi người chỉ điều khiển phe của mình.",
    ],
    create,
  });
})();
