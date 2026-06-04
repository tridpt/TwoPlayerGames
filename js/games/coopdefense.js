/* Thủ Thành Hợp Tác - co-op tower defense nhiều đường. */
(function () {
  const LANES = 3;
  const SLOTS = 8;
  const LEAK_LIMIT = 1;
  const MAX_WAVE = 10;

  const MAPS = [
    {
      id: "forest",
      name: "Rừng Uốn Lượn",
      theme: "forest",
      note: "đường cân bằng",
      routes: [
        [{ x: 4, y: 25 }, { x: 16, y: 30 }, { x: 29, y: 18 }, { x: 43, y: 25 }, { x: 57, y: 20 }, { x: 70, y: 34 }, { x: 84, y: 29 }, { x: 97, y: 21 }],
        [{ x: 4, y: 51 }, { x: 17, y: 58 }, { x: 31, y: 49 }, { x: 45, y: 53 }, { x: 58, y: 43 }, { x: 71, y: 56 }, { x: 85, y: 50 }, { x: 97, y: 55 }],
        [{ x: 4, y: 77 }, { x: 18, y: 80 }, { x: 32, y: 70 }, { x: 46, y: 82 }, { x: 59, y: 72 }, { x: 72, y: 84 }, { x: 86, y: 76 }, { x: 97, y: 81 }],
      ],
      slots: [
        [{ x: 14, y: 17 }, { x: 27, y: 34 }, { x: 39, y: 13 }, { x: 51, y: 35 }, { x: 63, y: 13 }, { x: 73, y: 45 }, { x: 84, y: 17 }, { x: 92, y: 37 }],
        [{ x: 14, y: 45 }, { x: 26, y: 67 }, { x: 39, y: 40 }, { x: 51, y: 64 }, { x: 63, y: 35 }, { x: 73, y: 66 }, { x: 84, y: 42 }, { x: 92, y: 63 }],
        [{ x: 14, y: 69 }, { x: 27, y: 88 }, { x: 39, y: 62 }, { x: 51, y: 90 }, { x: 63, y: 65 }, { x: 73, y: 91 }, { x: 84, y: 69 }, { x: 92, y: 89 }],
      ],
      scenery: [["rock", 10, 14], ["tree", 22, 12], ["tent", 25, 42], ["crate", 38, 88], ["flag", 53, 34], ["hut", 83, 13], ["well", 66, 58], ["stump", 91, 93], ["barrel", 12, 91], ["tree", 78, 92]],
    },
    {
      id: "coast",
      name: "Bờ Biển",
      theme: "coast",
      note: "nhiều khúc sát mép",
      routes: [
        [{ x: 4, y: 33 }, { x: 18, y: 24 }, { x: 31, y: 31 }, { x: 44, y: 22 }, { x: 58, y: 29 }, { x: 72, y: 24 }, { x: 86, y: 36 }, { x: 97, y: 31 }],
        [{ x: 4, y: 56 }, { x: 17, y: 50 }, { x: 31, y: 60 }, { x: 44, y: 50 }, { x: 58, y: 61 }, { x: 72, y: 52 }, { x: 86, y: 59 }, { x: 97, y: 51 }],
        [{ x: 4, y: 76 }, { x: 18, y: 83 }, { x: 31, y: 74 }, { x: 44, y: 86 }, { x: 58, y: 76 }, { x: 72, y: 87 }, { x: 86, y: 78 }, { x: 97, y: 84 }],
      ],
      slots: [
        [{ x: 13, y: 42 }, { x: 25, y: 17 }, { x: 37, y: 41 }, { x: 50, y: 15 }, { x: 63, y: 39 }, { x: 74, y: 15 }, { x: 84, y: 47 }, { x: 92, y: 23 }],
        [{ x: 13, y: 65 }, { x: 25, y: 42 }, { x: 37, y: 70 }, { x: 50, y: 42 }, { x: 63, y: 72 }, { x: 74, y: 43 }, { x: 84, y: 68 }, { x: 92, y: 43 }],
        [{ x: 13, y: 87 }, { x: 25, y: 70 }, { x: 37, y: 90 }, { x: 50, y: 70 }, { x: 63, y: 91 }, { x: 74, y: 72 }, { x: 84, y: 92 }, { x: 92, y: 72 }],
      ],
      scenery: [["water", 11, 92], ["water", 79, 14], ["rock", 20, 38], ["barrel", 34, 18], ["crate", 51, 72], ["flag", 61, 42], ["hut", 89, 18], ["well", 72, 68], ["stump", 42, 92], ["rock", 95, 65]],
    },
    {
      id: "canyon",
      name: "Hẻm Núi",
      theme: "canyon",
      note: "quái đi nhanh hơn",
      speed: 1.08,
      routes: [
        [{ x: 4, y: 20 }, { x: 15, y: 31 }, { x: 28, y: 20 }, { x: 41, y: 36 }, { x: 55, y: 22 }, { x: 69, y: 38 }, { x: 83, y: 24 }, { x: 97, y: 35 }],
        [{ x: 4, y: 48 }, { x: 16, y: 61 }, { x: 29, y: 48 }, { x: 42, y: 61 }, { x: 55, y: 48 }, { x: 69, y: 62 }, { x: 84, y: 49 }, { x: 97, y: 61 }],
        [{ x: 4, y: 79 }, { x: 16, y: 69 }, { x: 29, y: 83 }, { x: 42, y: 69 }, { x: 55, y: 84 }, { x: 69, y: 70 }, { x: 84, y: 86 }, { x: 97, y: 73 }],
      ],
      slots: [
        [{ x: 13, y: 16 }, { x: 25, y: 38 }, { x: 37, y: 15 }, { x: 49, y: 43 }, { x: 61, y: 14 }, { x: 74, y: 45 }, { x: 86, y: 16 }, { x: 92, y: 45 }],
        [{ x: 13, y: 42 }, { x: 25, y: 67 }, { x: 37, y: 42 }, { x: 49, y: 67 }, { x: 61, y: 42 }, { x: 74, y: 68 }, { x: 86, y: 42 }, { x: 92, y: 68 }],
        [{ x: 13, y: 88 }, { x: 25, y: 63 }, { x: 37, y: 90 }, { x: 49, y: 63 }, { x: 61, y: 91 }, { x: 74, y: 63 }, { x: 86, y: 92 }, { x: 92, y: 64 }],
      ],
      scenery: [["bones", 18, 15], ["rock", 31, 39], ["rock", 46, 15], ["barrel", 54, 68], ["flag", 65, 38], ["ruin", 82, 15], ["bones", 88, 92], ["crate", 22, 91], ["rock", 71, 88], ["fire", 10, 63]],
    },
    {
      id: "ruins",
      name: "Tàn Tích Pha Lê",
      theme: "ruins",
      note: "đường dài, nhiều góc",
      routes: [
        [{ x: 4, y: 28 }, { x: 14, y: 19 }, { x: 28, y: 29 }, { x: 39, y: 18 }, { x: 53, y: 32 }, { x: 66, y: 22 }, { x: 80, y: 34 }, { x: 97, y: 25 }],
        [{ x: 4, y: 52 }, { x: 15, y: 63 }, { x: 28, y: 54 }, { x: 40, y: 65 }, { x: 53, y: 51 }, { x: 66, y: 63 }, { x: 80, y: 51 }, { x: 97, y: 59 }],
        [{ x: 4, y: 80 }, { x: 16, y: 73 }, { x: 28, y: 86 }, { x: 41, y: 76 }, { x: 54, y: 88 }, { x: 67, y: 75 }, { x: 81, y: 86 }, { x: 97, y: 78 }],
      ],
      slots: [
        [{ x: 13, y: 34 }, { x: 25, y: 15 }, { x: 36, y: 38 }, { x: 49, y: 14 }, { x: 61, y: 40 }, { x: 72, y: 16 }, { x: 84, y: 43 }, { x: 92, y: 16 }],
        [{ x: 13, y: 68 }, { x: 25, y: 45 }, { x: 37, y: 70 }, { x: 49, y: 43 }, { x: 61, y: 70 }, { x: 73, y: 43 }, { x: 84, y: 68 }, { x: 92, y: 48 }],
        [{ x: 13, y: 90 }, { x: 25, y: 68 }, { x: 37, y: 92 }, { x: 49, y: 70 }, { x: 61, y: 93 }, { x: 73, y: 68 }, { x: 84, y: 93 }, { x: 92, y: 70 }],
      ],
      scenery: [["crystal", 18, 14], ["ruin", 30, 43], ["crystal", 46, 14], ["flag", 56, 70], ["well", 68, 40], ["ruin", 84, 15], ["crystal", 89, 92], ["crate", 21, 91], ["rock", 72, 88], ["crystal", 10, 62]],
    },
  ];

  const TOWERS = {
    rifle: { name: "Súng máy", short: "SM", cost: 42, dmg: 8, rate: 6, range: 0.17, color: "#ffd166", note: "bắn nhanh" },
    cannon: { name: "Pháo nổ", short: "PH", cost: 74, dmg: 21, rate: 14, range: 0.16, splash: 0.075, color: "#ff8d7a", note: "nổ lan" },
    frost: { name: "Tháp băng", short: "BG", cost: 64, dmg: 5, rate: 10, range: 0.19, slow: 32, color: "#7fe7ff", note: "làm chậm" },
    laser: { name: "Laser", short: "LS", cost: 96, dmg: 14, rate: 5, range: 0.24, pierce: 2, color: "#c6a7ff", note: "xuyên tuyến" },
    sniper: { name: "Xạ thủ", short: "XT", cost: 88, dmg: 42, rate: 18, range: 0.34, ignoreArmor: true, color: "#f6f0a8", note: "bắn xa" },
    tesla: { name: "Tesla", short: "TS", cost: 106, dmg: 15, rate: 9, range: 0.2, chain: 3, color: "#8afff1", note: "giật chuyền" },
    flame: { name: "Hỏa tháp", short: "HT", cost: 78, dmg: 9, rate: 7, range: 0.15, burn: 20, burnDmg: 3, color: "#ffb15c", note: "đốt cháy" },
    mortar: { name: "Cối đá", short: "CD", cost: 118, dmg: 34, rate: 22, range: 0.26, splash: 0.12, color: "#b7c1a1", note: "nổ rộng" },
  };

  const MONSTERS = {
    grunt: { name: "Bộ binh", hp: 26, speed: 0.0042, reward: 8 },
    runner: { name: "Chạy nhanh", hp: 18, speed: 0.0066, reward: 9 },
    swarm: { name: "Đàn nhỏ", hp: 12, speed: 0.0061, reward: 5 },
    brute: { name: "Giáp nặng", hp: 58, speed: 0.0029, reward: 15, armor: 2 },
    shield: { name: "Khiên", hp: 42, speed: 0.0035, reward: 13, armor: 4 },
    shaman: { name: "Pháp sư", hp: 36, speed: 0.0038, reward: 16, regen: 1 },
    bomber: { name: "Nổ giáp", hp: 34, speed: 0.0042, reward: 17, armor: 1 },
    ghost: { name: "Bóng ma", hp: 30, speed: 0.0053, reward: 16, slowResist: 0.72 },
    splitter: { name: "Tách đàn", hp: 46, speed: 0.0039, reward: 14, split: 2 },
    boss: { name: "Trùm cổng", hp: 180, speed: 0.0022, reward: 52, armor: 3 },
  };

  function create(ctx) {
    let leaks = 0;
    let coins = 210;
    let wave = 0;
    let phase = "prep";
    let tick = 0;
    let timer = null;
    let selectedType = "rifle";
    let selectedSlot = null;
    let activeMap = 0;
    let over = false;
    let monsterSeq = 1;
    const towers = Array.from({ length: LANES }, () => Array(SLOTS).fill(null));
    const monsters = [];
    const shots = [];
    let spawns = [];
    const log = ["Chọn map, đặt súng quanh đường. Không để quái lọt hết đường."];

    const root = document.createElement("div");
    root.className = "cd-root";
    root.innerHTML = `
      <div class="cd-hud" id="cdHud"></div>
      <div class="cd-layout">
        <div class="cd-map-scroll">
          <div class="cd-map" id="cdMap"></div>
        </div>
        <aside class="cd-panel" id="cdPanel"></aside>
      </div>
      <div class="cd-log" id="cdLog"></div>
    `;
    ctx.boardEl.appendChild(root);

    const hudEl = root.querySelector("#cdHud");
    const mapEl = root.querySelector("#cdMap");
    const panelEl = root.querySelector("#cdPanel");
    const logEl = root.querySelector("#cdLog");

    function applyMove(move, fromRemote) {
      if (over || !move) return;

      if (move.t === "map") {
        const idx = MAPS.findIndex((map) => map.id === move.map);
        if (idx < 0 || !canChangeMap()) return;
        activeMap = idx;
        selectedSlot = null;
        addLog(`Đổi sang map ${currentMap().name}.`);
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "map", map: currentMap().id });
        render();
        return;
      }

      if (move.t === "build") {
        const lane = clampInt(move.lane, 0, LANES - 1);
        const slot = clampInt(move.slot, 0, SLOTS - 1);
        const type = TOWERS[move.type] ? move.type : "rifle";
        const def = TOWERS[type];
        if (phase === "done" || towers[lane][slot] || coins < def.cost) return;
        coins -= def.cost;
        towers[lane][slot] = { type, level: 1, cooldown: 0 };
        selectedSlot = { lane, slot };
        addLog(`Xây ${def.name} ở đường ${lane + 1}.`);
        ctx.sound("place");
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "build", lane, slot, type });
        render();
        return;
      }

      if (move.t === "upgrade") {
        const lane = clampInt(move.lane, 0, LANES - 1);
        const slot = clampInt(move.slot, 0, SLOTS - 1);
        const tower = towers[lane][slot];
        if (phase === "done" || !tower || tower.level >= 5) return;
        const cost = upgradeCost(tower);
        if (coins < cost) return;
        coins -= cost;
        tower.level++;
        selectedSlot = { lane, slot };
        addLog(`Nâng ${TOWERS[tower.type].name} đường ${lane + 1} lên cấp ${tower.level}.`);
        ctx.sound("capture");
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "upgrade", lane, slot });
        render();
        return;
      }

      if (move.t === "sell") {
        const lane = clampInt(move.lane, 0, LANES - 1);
        const slot = clampInt(move.slot, 0, SLOTS - 1);
        const tower = towers[lane][slot];
        if (phase === "done" || !tower) return;
        const refund = Math.floor(towerValue(tower) * 0.5);
        coins += refund;
        towers[lane][slot] = null;
        selectedSlot = null;
        addLog(`Bán tháp lấy lại ${refund} vàng.`);
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "sell", lane, slot });
        render();
        return;
      }

      if (move.t === "start") {
        if (phase !== "prep" || over) return;
        if (!fromRemote && ctx.isOnline) ctx.sendMove({ t: "start" });
        startWave();
      }
    }

    function currentMap() {
      return MAPS[activeMap];
    }

    function canChangeMap() {
      return phase === "prep" && wave === 0 && !hasAnyTower();
    }

    function hasAnyTower() {
      return towers.some((lane) => lane.some(Boolean));
    }

    function clampInt(value, min, max) {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n)) return min;
      return Math.max(min, Math.min(max, n));
    }

    function routePoint(lane, progress) {
      const route = currentMap().routes[lane];
      const p = Math.max(0, Math.min(1, progress));
      const lengths = [];
      let total = 0;
      for (let i = 1; i < route.length; i++) {
        const len = distance(route[i - 1], route[i]);
        lengths.push(len);
        total += len;
      }
      let target = p * total;
      for (let i = 0; i < lengths.length; i++) {
        if (target > lengths[i]) {
          target -= lengths[i];
          continue;
        }
        const a = route[i];
        const b = route[i + 1];
        const t = lengths[i] ? target / lengths[i] : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      return route[route.length - 1];
    }

    function slotPoint(lane, slot) {
      return currentMap().slots[lane][slot];
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function routePolyline(lane) {
      return currentMap().routes[lane].map((p) => `${p.x},${p.y}`).join(" ");
    }

    function towerValue(tower) {
      let total = TOWERS[tower.type].cost;
      for (let lv = 1; lv < tower.level; lv++) {
        total += Math.round(TOWERS[tower.type].cost * (0.55 + lv * 0.2));
      }
      return total;
    }

    function upgradeCost(tower) {
      return Math.round(TOWERS[tower.type].cost * (0.55 + tower.level * 0.2));
    }

    function startWave() {
      wave++;
      tick = 0;
      phase = "wave";
      spawns = makeWave(wave);
      shots.length = 0;
      ctx.setTurn(0);
      addLog(`Wave ${wave} bắt đầu trên map ${currentMap().name}. Vẫn có thể xây súng trong lúc quái chạy.`);
      ctx.setStatus(`Wave ${wave}/${MAX_WAVE}: chặn quái trước khi chúng lọt hết đường.`);
      if (timer) clearInterval(timer);
      timer = setInterval(step, 100);
      render();
    }

    function makeWave(n) {
      const count = 12 + n * 5;
      const interval = Math.max(3, 8 - Math.floor(n / 3));
      const list = [];
      for (let i = 0; i < count; i++) {
        const type = waveMonsterType(n, i);
        const lane = (i * 2 + n) % LANES;
        list.push({ at: 5 + i * interval, lane, type });
        if (type === "swarm") {
          list.push({ at: 7 + i * interval, lane: (lane + 1) % LANES, type: "swarm" });
        }
      }
      if (n % 3 === 0) {
        list.push({ at: count * interval + 8, lane: 0, type: "bomber" });
        list.push({ at: count * interval + 12, lane: 2, type: "splitter" });
      }
      if (n === MAX_WAVE) {
        list.push({ at: count * interval + 20, lane: 1, type: "boss" });
        list.push({ at: count * interval + 26, lane: 0, type: "shaman" });
        list.push({ at: count * interval + 30, lane: 2, type: "ghost" });
      }
      return list.sort((a, b) => a.at - b.at);
    }

    function waveMonsterType(n, i) {
      if (n >= 8 && i % 17 === 8) return "ghost";
      if (n >= 7 && i % 14 === 5) return "splitter";
      if (n >= 6 && i % 13 === 4) return "bomber";
      if (n >= 5 && i % 11 === 3) return "shaman";
      if (n >= 4 && i % 9 === 6) return "shield";
      if (n >= 3 && i % 7 === 4) return "brute";
      if (n >= 2 && i % 5 === 2) return "runner";
      if (i % 6 === 1) return "swarm";
      return "grunt";
    }

    function step() {
      if (!root.isConnected) {
        clearInterval(timer);
        timer = null;
        return;
      }
      if (phase !== "wave" || over) return;
      tick++;

      while (spawns.length && spawns[0].at <= tick) {
        spawnMonster(spawns.shift());
      }

      moveMonsters();
      if (over) return;
      fireTowers();
      applyMonsterEffects();
      resolveDeaths();
      updateShots();

      if (!spawns.length && monsters.length === 0) {
        endWave();
        return;
      }

      render();
    }

    function spawnMonster(spawn) {
      const base = MONSTERS[spawn.type];
      const hpScale = 1 + (wave - 1) * 0.24;
      monsters.push({
        id: monsterSeq++,
        type: spawn.type,
        lane: spawn.lane,
        x: 1.045,
        hp: Math.round(base.hp * hpScale),
        maxHp: Math.round(base.hp * hpScale),
        speed: base.speed * (1 + (wave - 1) * 0.035) * (currentMap().speed || 1),
        armor: base.armor || 0,
        regen: base.regen || 0,
        slowUntil: 0,
        burnUntil: 0,
        burnDmg: 0,
      });
    }

    function spawnMini(type, lane, progress) {
      const base = MONSTERS[type];
      const hpScale = 1 + (wave - 1) * 0.2;
      monsters.push({
        id: monsterSeq++,
        type,
        lane,
        x: Math.min(0.98, Math.max(0.08, progress + 0.025)),
        hp: Math.round(base.hp * hpScale),
        maxHp: Math.round(base.hp * hpScale),
        speed: base.speed * (1 + (wave - 1) * 0.035) * (currentMap().speed || 1),
        armor: base.armor || 0,
        regen: base.regen || 0,
        slowUntil: 0,
        burnUntil: 0,
        burnDmg: 0,
      });
    }

    function moveMonsters() {
      for (let i = monsters.length - 1; i >= 0; i--) {
        const m = monsters[i];
        const resist = MONSTERS[m.type].slowResist || 0.48;
        const slow = m.slowUntil > tick ? resist : 1;
        m.x -= m.speed * slow;
        if (m.x <= 0.018) {
          leaks++;
          addLog(`${MONSTERS[m.type].name} đã lọt hết đường. Phòng tuyến vỡ.`);
          monsters.splice(i, 1);
          ctx.sound("error");
          finish(false);
          return;
        }
      }
    }

    function fireTowers() {
      for (let lane = 0; lane < LANES; lane++) {
        for (let slot = 0; slot < SLOTS; slot++) {
          const tower = towers[lane][slot];
          if (!tower) continue;
          if (tower.cooldown > 0) {
            tower.cooldown--;
            continue;
          }
          const target = pickTarget(lane, slotPoint(lane, slot), TOWERS[tower.type].range * 100);
          if (!target) continue;
          shoot(tower, lane, slot, target);
        }
      }
    }

    function pickTarget(lane, from, range) {
      return monsters
        .filter((m) => m.lane === lane && distance(routePoint(lane, m.x), from) <= range)
        .sort((a, b) => a.x - b.x)[0] || null;
    }

    function shoot(tower, lane, slot, target) {
      const def = TOWERS[tower.type];
      const dmg = Math.round(def.dmg * (1 + (tower.level - 1) * 0.48));
      dealDamage(target, dmg, def);

      if (def.splash) {
        const targetPoint = routePoint(lane, target.x);
        monsters.forEach((m) => {
          if (m !== target && m.lane === lane && distance(routePoint(lane, m.x), targetPoint) <= def.splash * 100) {
            dealDamage(m, dmg * 0.55, def);
          }
        });
      }

      if (def.chain) {
        const targetPoint = routePoint(lane, target.x);
        monsters
          .filter((m) => m !== target && m.lane === lane && distance(routePoint(lane, m.x), targetPoint) <= 18)
          .sort((a, b) => distance(routePoint(lane, a.x), targetPoint) - distance(routePoint(lane, b.x), targetPoint))
          .slice(0, def.chain)
          .forEach((m) => {
            dealDamage(m, dmg * 0.55, def);
            shots.push({ from: routePoint(lane, target.x), to: routePoint(lane, m.x), type: tower.type, life: 3 });
          });
      }

      if (def.pierce) {
        monsters
          .filter((m) => m !== target && m.lane === lane && Math.abs(m.x - target.x) <= 0.08)
          .sort((a, b) => a.x - b.x)
          .slice(0, def.pierce)
          .forEach((m) => dealDamage(m, dmg * 0.5, def));
      }

      if (def.slow) target.slowUntil = Math.max(target.slowUntil, tick + def.slow + tower.level * 5);
      if (def.burn) {
        target.burnUntil = Math.max(target.burnUntil, tick + def.burn + tower.level * 4);
        target.burnDmg = Math.max(target.burnDmg, def.burnDmg + tower.level);
      }

      tower.cooldown = Math.max(3, Math.round(def.rate - (tower.level - 1) * 1.05));
      shots.push({ from: slotPoint(lane, slot), to: routePoint(lane, target.x), type: tower.type, life: 4 });
    }

    function dealDamage(monster, amount, def) {
      const armor = def.ignoreArmor ? 0 : monster.armor;
      monster.hp -= Math.max(1, Math.round(amount - armor));
    }

    function applyMonsterEffects() {
      monsters.forEach((m) => {
        if (m.burnUntil > tick && tick % 5 === 0) m.hp -= m.burnDmg;
        if (m.regen && tick % 10 === 0) m.hp = Math.min(m.maxHp, m.hp + m.regen);
      });
    }

    function resolveDeaths() {
      for (let i = monsters.length - 1; i >= 0; i--) {
        const m = monsters[i];
        if (m.hp > 0) continue;
        const def = MONSTERS[m.type];
        const reward = Math.round(def.reward * (1 + wave * 0.05));
        coins += reward;
        if (def.split) {
          for (let j = 0; j < def.split; j++) {
            spawnMini("swarm", (m.lane + j) % LANES, m.x);
          }
          addLog(`${def.name} tách thành đàn nhỏ.`);
        }
        monsters.splice(i, 1);
      }
    }

    function updateShots() {
      for (let i = shots.length - 1; i >= 0; i--) {
        shots[i].life--;
        if (shots[i].life <= 0) shots.splice(i, 1);
      }
    }

    function endWave() {
      clearInterval(timer);
      timer = null;
      phase = "prep";
      const bonus = 42 + wave * 11 + Math.max(0, 12 - monsters.length);
      coins += bonus;
      if (wave >= MAX_WAVE) {
        finish(true);
        return;
      }
      ctx.setTurn(0);
      addLog(`Qua wave ${wave}. Thưởng ${bonus} vàng.`);
      ctx.setStatus(`Qua wave ${wave}. Có ${coins} vàng để mở rộng hỏa lực trước wave ${wave + 1}.`);
      render();
    }

    function finish(win) {
      if (timer) clearInterval(timer);
      timer = null;
      over = true;
      phase = "done";
      ctx.setTurn(-1);
      render();
      if (win) {
        ctx.incScore(0);
        ctx.setStatus(`🎉 Đội phòng thủ thắng! Chặn sạch quái qua ${MAX_WAVE} wave.`);
      } else {
        ctx.incScore(1);
        ctx.setStatus("💀 Quái đã lọt hết đường. Cả đội thua ván này.");
      }
    }

    function addLog(text) {
      log.unshift(text);
      while (log.length > 7) log.pop();
    }

    function render() {
      renderHud();
      renderMap();
      renderPanel();
      renderLog();
    }

    function renderHud() {
      const leakPct = Math.max(0, LEAK_LIMIT - leaks) / LEAK_LIMIT * 100;
      hudEl.innerHTML = `
        <div class="cd-stat">
          <b>Phòng tuyến</b>
          <span>${leaks}/${LEAK_LIMIT} lọt</span>
          <i><em style="width:${leakPct}%"></em></i>
        </div>
        <div class="cd-stat">
          <b>Kho chung</b>
          <span>${coins} vàng</span>
          <small>${phase === "wave" ? "wave đang chạy" : "đang chuẩn bị"}</small>
        </div>
        <div class="cd-stat">
          <b>${currentMap().name}</b>
          <span>${Math.min(wave + (phase === "prep" ? 1 : 0), MAX_WAVE)}/${MAX_WAVE}</span>
          <small>${monsters.length} quái trên đường</small>
        </div>
      `;
    }

    function renderMap() {
      const map = currentMap();
      mapEl.className = `cd-map map-${map.theme}`;
      mapEl.innerHTML = `
        <div class="cd-forest cd-forest-top"></div>
        <div class="cd-forest cd-forest-bottom"></div>
        <div class="cd-scenery">${renderScenery()}</div>
        <svg class="cd-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${Array.from({ length: LANES }, (_, lane) => `
            <polyline class="cd-path-shadow" points="${routePolyline(lane)}"></polyline>
            <polyline class="cd-path-main path-${lane}" points="${routePolyline(lane)}"></polyline>
            <polyline class="cd-path-edge" points="${routePolyline(lane)}"></polyline>
          `).join("")}
        </svg>
        <div class="cd-spawn">Ổ quái</div>
        <div class="cd-lane-tags">
          ${map.routes.map((route, lane) => `<span style="left:${route[1].x}%;top:${Math.max(10, route[1].y - 8)}%">Đường ${lane + 1}</span>`).join("")}
        </div>
        ${Array.from({ length: LANES }, (_, lane) => Array.from({ length: SLOTS }, (_, slot) => renderSlot(lane, slot)).join("")).join("")}
        ${monsters.map(renderMonster).join("")}
        ${shots.map(renderShot).join("")}
      `;

      mapEl.querySelectorAll("[data-slot]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const lane = Number(btn.dataset.lane);
          const slot = Number(btn.dataset.slot);
          if (over) return;
          if (towers[lane][slot]) {
            selectedSlot = { lane, slot };
            render();
          } else {
            applyMove({ t: "build", lane, slot, type: selectedType }, false);
          }
        });
      });
    }

    function renderScenery() {
      return currentMap().scenery
        .map(([kind, x, y]) => `<span class="cd-deco cd-deco-${kind}" style="left:${x}%;top:${y}%"></span>`)
        .join("");
    }

    function renderSlot(lane, slot) {
      const tower = towers[lane][slot];
      const selected = selectedSlot && selectedSlot.lane === lane && selectedSlot.slot === slot;
      const pt = slotPoint(lane, slot);
      if (!tower) {
        return `<button class="cd-slot ${over ? "disabled" : ""}" data-lane="${lane}" data-slot="${slot}" style="left:${pt.x}%;top:${pt.y}%" title="Xây súng"></button>`;
      }
      const def = TOWERS[tower.type];
      return `
        <button class="cd-slot has-tower tower-${tower.type} ${selected ? "selected" : ""}" data-lane="${lane}" data-slot="${slot}" style="left:${pt.x}%;top:${pt.y}%;color:${def.color}" title="${def.name}">
          <span class="tower-model tower-${tower.type}"><i></i><em></em></span>
          <span class="tower-code">${def.short}</span>
          <small>${tower.level}</small>
        </button>
      `;
    }

    function renderMonster(m) {
      const pct = Math.max(0, m.hp) / m.maxHp * 100;
      const pt = routePoint(m.lane, m.x);
      return `
        <div class="cd-monster mon-${m.type} ${m.slowUntil > tick ? "slowed" : ""} ${m.burnUntil > tick ? "burning" : ""}" style="left:${pt.x}%;top:${pt.y}%" title="${MONSTERS[m.type].name}">
          <b></b>
          <i><em style="width:${pct}%"></em></i>
        </div>
      `;
    }

    function renderShot(s) {
      const def = TOWERS[s.type] || TOWERS.rifle;
      const dx = s.to.x - s.from.x;
      const dy = s.to.y - s.from.y;
      const width = Math.max(1.5, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return `<div class="cd-shot shot-${s.type}" style="left:${s.from.x}%;top:${s.from.y}%;width:${width}%;color:${def.color};transform:translateY(-50%) rotate(${angle}deg)"></div>`;
    }

    function renderPanel() {
      const sel = selectedSlot ? towers[selectedSlot.lane][selectedSlot.slot] : null;
      panelEl.innerHTML = `
        <div class="cd-panel-section">
          <h3>Map</h3>
          <div class="cd-map-list">
            ${MAPS.map((map) => `
              <button class="cd-map-card map-${map.theme} ${currentMap().id === map.id ? "active" : ""}" data-map="${map.id}" ${!canChangeMap() ? "disabled" : ""}>
                <b>${map.name}</b>
                <small>${map.note}</small>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="cd-panel-section">
          <h3>Kho súng</h3>
          <div class="cd-tower-list">
            ${Object.entries(TOWERS).map(([id, def]) => `
              <button class="cd-tower-card ${selectedType === id ? "active" : ""}" data-tower="${id}" style="--tower:${def.color}" ${over ? "disabled" : ""}>
                <span class="tower-chip tower-${id}"><i></i><em></em></span>
                <b>${def.name}</b>
                <small>${def.cost} vàng · ${def.note}</small>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="cd-panel-section">
          <h3>Điều khiển</h3>
          ${renderSelectedActions(sel)}
          <button class="btn primary cd-start" id="cdStart" ${phase !== "prep" || over ? "disabled" : ""}>${phase === "wave" ? "Wave đang chạy" : wave === 0 ? "Gọi wave 1" : "Gọi wave " + (wave + 1)}</button>
        </div>
      `;

      panelEl.querySelectorAll("[data-map]").forEach((btn) => {
        btn.addEventListener("click", () => applyMove({ t: "map", map: btn.dataset.map }, false));
      });
      panelEl.querySelectorAll("[data-tower]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedType = btn.dataset.tower;
          render();
        });
      });
      const startBtn = panelEl.querySelector("#cdStart");
      startBtn && startBtn.addEventListener("click", () => applyMove({ t: "start" }, false));
      const upgradeBtn = panelEl.querySelector("#cdUpgrade");
      upgradeBtn && upgradeBtn.addEventListener("click", () => applyMove({ t: "upgrade", lane: selectedSlot.lane, slot: selectedSlot.slot }, false));
      const sellBtn = panelEl.querySelector("#cdSell");
      sellBtn && sellBtn.addEventListener("click", () => applyMove({ t: "sell", lane: selectedSlot.lane, slot: selectedSlot.slot }, false));
    }

    function renderSelectedActions(tower) {
      if (!selectedSlot || !tower) {
        return `<div class="cd-empty-select">Chọn súng rồi bấm bãi xây trống trên map. Wave chạy vẫn xây và nâng cấp được.</div>`;
      }
      const def = TOWERS[tower.type];
      const cost = upgradeCost(tower);
      return `
        <div class="cd-selected">
          <b>${def.name} đường ${selectedSlot.lane + 1}</b>
          <span>Cấp ${tower.level}/5 · ${def.note}</span>
          <div class="cd-action-row">
            <button class="btn" id="cdUpgrade" ${tower.level >= 5 || coins < cost || over ? "disabled" : ""}>Nâng (${tower.level >= 5 ? "max" : cost + " vàng"})</button>
            <button class="btn" id="cdSell" ${over ? "disabled" : ""}>Bán</button>
          </div>
        </div>
      `;
    }

    function renderLog() {
      logEl.innerHTML = log.map((line) => `<span>${line}</span>`).join("");
    }

    ctx.setNames("Đội phòng thủ", "Bầy quái");
    ctx.setTurn(0);
    ctx.setStatus("Chọn map, đặt súng quanh đường rồi gọi wave. Không để quái lọt hết đường.");
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "coopdefense",
    name: "Thủ Thành Hợp Tác",
    emoji: "CD",
    description: "Hai người cùng thủ đường: chọn nhiều map, mua nhiều loại súng, chặn nhiều loại quái và vẫn xây được khi wave đang chạy.",
    onlineReady: true,
    options: [],
    howTo: [
      "Đây là game hợp tác: cả hai người dùng chung vàng để giữ các đường không cho quái lọt qua phòng tuyến.",
      "Có nhiều map. Chọn map trước khi xây tháp hoặc gọi wave đầu tiên; sau khi đã xây thì map sẽ khóa cho ván đó.",
      "Quái xuất hiện từ ổ quái bên phải và chạy theo 3 đường về mép trái. Chỉ cần một quái lọt hết đường là thua.",
      "Có nhiều súng: súng máy, pháo nổ, băng, laser, xạ thủ, Tesla, hỏa tháp và cối đá. Mỗi loại có tầm, nhịp bắn và hiệu ứng riêng.",
      "Trong lúc wave đang chạy vẫn có thể chọn súng, xây bãi trống, nâng cấp hoặc bán tháp.",
      "Qua wave sẽ nhận thêm vàng. Sống sót qua toàn bộ wave là cả đội thắng.",
    ],
    create,
  });
})();
