/* Dungeon Rival - hai dungeon rieng, nhat do, len cap, pha doi thu bang quai/bay. */
(function () {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const ALL_DIRS = [[0, 0], ...DIRS, [-1, -1], [-1, 1], [1, -1], [1, 1]];
  const MAX_LOG = 6;

  const SABOTAGE = {
    imp: { cost: 3, label: "Gửi quái", icon: "IMP", hint: "đặt quái gần đối thủ" },
    trap: { cost: 2, label: "Gài bẫy", icon: "TRAP", hint: "đặt bẫy quanh đối thủ" },
    curse: { cost: 4, label: "Lời nguyền", icon: "HEX", hint: "gây sát thương trực tiếp" },
  };

  const LOOT = {
    blade: { label: "Kiếm cổ", icon: "⚔", text: "+2 công" },
    armor: { label: "Giáp da", icon: "◆", text: "+1 thủ" },
    potion: { label: "Bình máu", icon: "+", text: "+1 bình máu" },
    shadow: { label: "Ấn bóng tối", icon: "☾", text: "+3 bóng tối" },
    heal: { label: "Suối hồi phục", icon: "♥", text: "hồi máu" },
  };

  function create(ctx) {
    const o = ctx.options || {};
    const N = o.size || 7;
    const BOSS_LEVEL = o.boss || 5;
    const DANGER = o.danger === "hard" ? 1.18 : o.danger === "easy" ? 0.88 : 1;

    const heroes = [
      makeHero(0, N - 1, 0),
      makeHero(1, N - 1, N - 1),
    ];
    const dungeons = [makeDungeon(0), makeDungeon(1)];
    dungeons.forEach((_, side) => reveal(side));
    let turn = 0;
    let over = false;
    const log = ["Hai kẻ thám hiểm bước vào hai hầm ngục song song."];

    const root = document.createElement("div");
    root.className = "dr-root";
    ctx.boardEl.appendChild(root);

    const hud = document.createElement("div");
    hud.className = "dr-hud";
    root.appendChild(hud);

    const actions = document.createElement("div");
    actions.className = "dr-actions";
    root.appendChild(actions);

    const boards = document.createElement("div");
    boards.className = "dr-boards";
    root.appendChild(boards);

    const cells = [[], []];
    for (let side = 0; side < 2; side++) {
      const wrap = document.createElement("div");
      wrap.className = "dr-board-wrap";
      wrap.innerHTML = `<div class="dr-board-title"></div>`;
      const board = document.createElement("div");
      board.className = "dr-board";
      board.style.setProperty("--dr-n", N);
      wrap.appendChild(board);
      boards.appendChild(wrap);
      cells[side] = Array.from({ length: N }, () => Array(N));
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dr-cell";
          btn.addEventListener("click", () => onCell(side, r, c));
          board.appendChild(btn);
          cells[side][r][c] = btn;
        }
      }
    }

    function makeHero(idx, r, c) {
      return {
        idx,
        r,
        c,
        hp: 54,
        maxHp: 54,
        atk: 9,
        def: 2,
        lvl: 1,
        xp: 0,
        shadow: 2,
        pots: 1,
        relics: 0,
      };
    }

    function makeDungeon(owner) {
      const start = owner === 0 ? { r: N - 1, c: 0 } : { r: N - 1, c: N - 1 };
      const boss = owner === 0 ? { r: 0, c: N - 1 } : { r: 0, c: 0 };
      const map = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => {
        const depth = Math.abs(start.r - r) + Math.abs(start.c - c);
        return { kind: "empty", seen: false, depth, lvl: Math.max(1, Math.ceil(depth / 3)) };
      }));

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if ((r === start.r && c === start.c) || (r === boss.r && c === boss.c)) continue;
          const cell = map[r][c];
          const roll = ctx.rng();
          if (roll < 0.34 * DANGER) cell.kind = "monster";
          else if (roll < 0.43 * DANGER) cell.kind = "elite";
          else if (roll < 0.57) cell.kind = "treasure";
          else if (roll < 0.69) cell.kind = "trap";
          else if (roll < 0.79) cell.kind = "shrine";
          else cell.kind = "empty";

          if (cell.kind === "treasure") cell.loot = pickLoot();
          if (cell.kind === "monster" || cell.kind === "elite") fillMonster(cell, cell.kind, owner);
          if (cell.kind === "trap") cell.power = 8 + cell.lvl * 3;
        }
      }
      map[start.r][start.c] = { kind: "start", seen: true, depth: 0, lvl: 1 };
      map[boss.r][boss.c] = { kind: "boss", seen: false, depth: N * 2, lvl: BOSS_LEVEL };
      fillMonster(map[boss.r][boss.c], "boss", owner);
      return map;
    }

    function pickLoot() {
      const roll = ctx.rng();
      if (roll < 0.25) return "blade";
      if (roll < 0.45) return "armor";
      if (roll < 0.68) return "potion";
      if (roll < 0.86) return "shadow";
      return "heal";
    }

    function fillMonster(cell, kind) {
      const lvl = cell.lvl || 1;
      const elite = kind === "elite";
      const boss = kind === "boss";
      cell.name = boss ? "Chúa hầm" : elite ? "Quái tinh nhuệ" : monsterName(lvl);
      cell.mhp = Math.round((boss ? 58 : elite ? 30 : 18) + lvl * (boss ? 13 : elite ? 8 : 5));
      cell.matk = Math.round((boss ? 10 : elite ? 7 : 5) + lvl * (boss ? 2.2 : elite ? 1.5 : 1.1));
      cell.xp = Math.round((boss ? 18 : elite ? 10 : 6) + lvl * (boss ? 5 : elite ? 3 : 2));
      cell.shadow = boss ? 0 : elite ? 3 : 2;
    }

    function monsterName(lvl) {
      if (lvl <= 2) return "Nhện hang";
      if (lvl <= 4) return "Xương lang thang";
      return "Hộ vệ địa lao";
    }

    function onCell(side, r, c) {
      if (!canAct() || side !== turn) return;
      if (!legalStep(side, r, c)) return;
      applyMove({ t: "move", r, c }, false);
    }

    function canAct(fromRemote) {
      return !over && (fromRemote || !ctx.isOnline || turn === ctx.mySeat);
    }

    function applyMove(move, fromRemote) {
      if (!canAct(fromRemote)) return;
      let ok = false;
      if (move.t === "move") ok = doMove(move.r, move.c);
      else if (move.t === "potion") ok = doPotion();
      else if (move.t === "sabotage") ok = doSabotage(move.kind);
      if (!ok) return;
      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
      if (!over) endTurn();
      render();
      updateStatus();
    }

    function doMove(r, c) {
      if (!legalStep(turn, r, c)) return false;
      const hero = heroes[turn];
      hero.r = r;
      hero.c = c;
      const cell = dungeons[turn][r][c];
      cell.seen = true;
      resolveCell(turn, cell);
      reveal(turn);
      return true;
    }

    function doPotion() {
      const hero = heroes[turn];
      if (hero.pots <= 0 || hero.hp >= hero.maxHp) return false;
      hero.pots -= 1;
      const before = hero.hp;
      hero.hp = Math.min(hero.maxHp, hero.hp + 26 + hero.lvl * 3);
      addLog(`Người chơi ${turn + 1} uống bình máu: ${before} → ${hero.hp} HP.`);
      ctx.sound("select");
      return true;
    }

    function doSabotage(kind) {
      const cfg = SABOTAGE[kind];
      if (!cfg) return false;
      const hero = heroes[turn];
      if (hero.shadow < cfg.cost) return false;
      hero.shadow -= cfg.cost;
      const target = 1 - turn;
      if (kind === "curse") {
        const dmg = 9 + hero.lvl * 3;
        heroes[target].hp = Math.max(0, heroes[target].hp - dmg);
        addLog(`Người chơi ${turn + 1} gieo lời nguyền, P${target + 1} mất ${dmg} HP.`);
        ctx.sound("shot");
        if (heroes[target].hp <= 0) finish(turn, "hạ đối thủ bằng lời nguyền");
        return true;
      }
      const spot = sabotageSpot(target);
      if (!spot) {
        addLog("Không còn chỗ trống để phá dungeon đối thủ.");
        return true;
      }
      const cell = dungeons[target][spot.r][spot.c];
      if (kind === "imp") {
        cell.kind = "monster";
        cell.lvl = Math.max(cell.lvl || 1, heroes[turn].lvl + 1);
        fillMonster(cell, "monster", target);
        cell.name = "Quái gửi sang";
      } else {
        cell.kind = "trap";
        cell.power = 12 + heroes[turn].lvl * 4;
      }
      cell.seen = true;
      addLog(`Người chơi ${turn + 1} ${kind === "imp" ? "gửi quái" : "gài bẫy"} vào dungeon P${target + 1}.`);
      ctx.sound("capture");
      return true;
    }

    function sabotageSpot(target) {
      const h = heroes[target];
      const preferred = ALL_DIRS
        .map(([dr, dc]) => ({ r: h.r + dr, c: h.c + dc }))
        .filter((p) => inside(p.r, p.c) && !(p.r === h.r && p.c === h.c));
      const all = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) all.push({ r, c });
      return [...preferred, ...all].find((p) => {
        const cell = dungeons[target][p.r][p.c];
        return passableKind(cell.kind) && !isHeroAt(target, p.r, p.c);
      });
    }

    function resolveCell(side, cell) {
      const hero = heroes[side];
      if (cell.kind === "monster" || cell.kind === "elite" || cell.kind === "boss") {
        fight(side, cell);
      } else if (cell.kind === "trap") {
        const dmg = Math.max(1, cell.power - hero.def);
        hero.hp = Math.max(0, hero.hp - dmg);
        hero.shadow += 1;
        addLog(`P${side + 1} dính bẫy, mất ${dmg} HP và thu được 1 bóng tối.`);
        cell.kind = "empty";
        ctx.sound("miss");
        if (hero.hp <= 0) finish(1 - side, "đối thủ gục vì bẫy");
      } else if (cell.kind === "treasure") {
        applyLoot(side, cell.loot);
        cell.kind = "empty";
        ctx.sound("capture");
      } else if (cell.kind === "shrine") {
        const before = hero.hp;
        hero.maxHp += 4;
        hero.hp = Math.min(hero.maxHp, hero.hp + 22);
        hero.shadow += 1;
        addLog(`P${side + 1} dùng đền thờ: HP ${before} → ${hero.hp}, max HP +4.`);
        cell.kind = "empty";
        ctx.sound("select");
      } else {
        addLog(`P${side + 1} tiến sâu hơn trong hầm ngục.`);
        ctx.sound("place");
      }
    }

    function fight(side, cell) {
      const hero = heroes[side];
      const rounds = Math.max(1, Math.ceil(cell.mhp / hero.atk));
      const dmg = Math.max(1, cell.matk - hero.def) * rounds;
      hero.hp = Math.max(0, hero.hp - dmg);
      const boss = cell.kind === "boss";
      addLog(`P${side + 1} đánh ${cell.name}: nhận ${dmg} sát thương, +${cell.xp} XP.`);
      if (hero.hp <= 0) {
        ctx.sound("miss");
        finish(1 - side, `P${side + 1} gục trước ${cell.name}`);
        return;
      }
      hero.xp += cell.xp;
      hero.shadow += cell.shadow || 0;
      if (!boss && ctx.rng() < 0.22) {
        const loot = pickLoot();
        applyLoot(side, loot, true);
      }
      cell.kind = "empty";
      ctx.sound(boss ? "win" : "capture");
      levelUp(side);
      if (boss) finish(side, "đánh bại Chúa hầm");
    }

    function applyLoot(side, loot, quiet) {
      const hero = heroes[side];
      const def = LOOT[loot] || LOOT.potion;
      if (loot === "blade") hero.atk += 2;
      else if (loot === "armor") hero.def += 1;
      else if (loot === "potion") hero.pots += 1;
      else if (loot === "shadow") hero.shadow += 3;
      else if (loot === "heal") hero.hp = Math.min(hero.maxHp, hero.hp + 28);
      if (!quiet) addLog(`P${side + 1} nhặt ${def.label}: ${def.text}.`);
      else addLog(`P${side + 1} tìm thêm ${def.label} sau trận.`);
    }

    function levelUp(side) {
      const hero = heroes[side];
      let need = hero.lvl * 10;
      while (hero.xp >= need) {
        hero.xp -= need;
        hero.lvl += 1;
        hero.maxHp += 9;
        hero.hp = Math.min(hero.maxHp, hero.hp + 16);
        hero.atk += 2;
        if (hero.lvl % 2 === 0) hero.def += 1;
        hero.shadow += 1;
        addLog(`P${side + 1} lên cấp ${hero.lvl}: công, máu và bóng tối tăng.`);
        need = hero.lvl * 10;
      }
    }

    function endTurn() {
      turn = 1 - turn;
      heroes[turn].shadow += 1;
      reveal(turn);
      ctx.setTurn(turn);
    }

    function reveal(side) {
      const hero = heroes[side];
      ALL_DIRS.forEach(([dr, dc]) => {
        const r = hero.r + dr, c = hero.c + dc;
        if (inside(r, c)) dungeons[side][r][c].seen = true;
      });
    }

    function legalStep(side, r, c) {
      if (!inside(r, c)) return false;
      const hero = heroes[side];
      return Math.abs(hero.r - r) + Math.abs(hero.c - c) === 1;
    }

    function passableKind(kind) {
      return kind === "empty" || kind === "treasure" || kind === "trap" || kind === "shrine";
    }

    function inside(r, c) {
      return r >= 0 && r < N && c >= 0 && c < N;
    }

    function isHeroAt(side, r, c) {
      return heroes[side].r === r && heroes[side].c === c;
    }

    function addLog(text) {
      log.unshift(text);
      if (log.length > MAX_LOG) log.pop();
    }

    function finish(winner, reason) {
      if (over) return;
      over = true;
      ctx.setTurn(-1);
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng - ${reason}!`);
    }

    function render() {
      hud.innerHTML = `${heroPanel(0)}<div class="dr-mid"><b>${over ? "Kết thúc" : "Lượt Người chơi " + (turn + 1)}</b><span>Boss cấp ${BOSS_LEVEL} · dungeon ${N}x${N}</span><small>${log[0] || ""}</small></div>${heroPanel(1)}`;
      renderActions();
      for (let side = 0; side < 2; side++) renderDungeon(side);
    }

    function heroPanel(side) {
      const h = heroes[side];
      const hpPct = Math.max(0, h.hp / h.maxHp * 100);
      const xpPct = Math.max(0, h.xp / (h.lvl * 10) * 100);
      return `
        <div class="dr-hero-panel p${side + 1} ${turn === side && !over ? "active" : ""}">
          <span>Người chơi ${side + 1}</span>
          <b>Lv ${h.lvl}</b>
          <em>${h.hp}/${h.maxHp} HP · Công ${h.atk} · Thủ ${h.def}</em>
          <i class="dr-bar hp"><i style="width:${hpPct}%"></i></i>
          <i class="dr-bar xp"><i style="width:${xpPct}%"></i></i>
          <small>${h.pots} bình máu · ${h.shadow} bóng tối</small>
        </div>
      `;
    }

    function renderActions() {
      const h = heroes[turn];
      actions.innerHTML = `
        <button class="btn small dr-action" data-act="potion"><span>HP</span><b>Bình máu</b><small>${h.pots} còn lại</small></button>
        ${Object.entries(SABOTAGE).map(([id, s]) => `
          <button class="btn small dr-action" data-act="${id}">
            <span>${s.icon}</span><b>${s.label}</b><small>${s.cost} bóng tối · ${s.hint}</small>
          </button>
        `).join("")}
      `;
      actions.querySelector('[data-act="potion"]').disabled = !canAct() || h.pots <= 0 || h.hp >= h.maxHp;
      actions.querySelector('[data-act="potion"]').addEventListener("click", () => applyMove({ t: "potion" }, false));
      Object.keys(SABOTAGE).forEach((id) => {
        const btn = actions.querySelector(`[data-act="${id}"]`);
        btn.disabled = !canAct() || h.shadow < SABOTAGE[id].cost;
        btn.addEventListener("click", () => applyMove({ t: "sabotage", kind: id }, false));
      });
    }

    function renderDungeon(side) {
      const wrap = boards.children[side];
      wrap.classList.toggle("active", side === turn && !over);
      wrap.querySelector(".dr-board-title").textContent = `Dungeon Người chơi ${side + 1}`;
      const h = heroes[side];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = dungeons[side][r][c];
          const el = cells[side][r][c];
          const isHero = h.r === r && h.c === c;
          const legal = side === turn && legalStep(side, r, c) && !over;
          el.className = "dr-cell";
          el.disabled = !canAct() || side !== turn || !legal;
          if (!cell.seen && !isHero) {
            el.classList.add("fog");
            el.innerHTML = `<span class="dr-icon">?</span>`;
          } else {
            el.classList.add("seen", cell.kind);
            if (legal) el.classList.add("legal");
            el.innerHTML = tileMarkup(cell, isHero, side);
          }
        }
      }
    }

    function tileMarkup(cell, isHero, side) {
      if (isHero) return `<span class="dr-adventurer p${side + 1}"><i></i><b>${side + 1}</b></span>`;
      if (cell.kind === "monster") return `<span class="dr-icon monster">☠</span><small>${cell.lvl}</small>`;
      if (cell.kind === "elite") return `<span class="dr-icon elite">♜</span><small>${cell.lvl}</small>`;
      if (cell.kind === "boss") return `<span class="dr-icon boss">♛</span><small>${cell.lvl}</small>`;
      if (cell.kind === "treasure") return `<span class="dr-icon treasure">${LOOT[cell.loot]?.icon || "$"}</span>`;
      if (cell.kind === "trap") return `<span class="dr-icon trap">!</span>`;
      if (cell.kind === "shrine") return `<span class="dr-icon shrine">✦</span>`;
      if (cell.kind === "start") return `<span class="dr-icon start">⌂</span>`;
      return `<span class="dr-icon empty">·</span>`;
    }

    ctx.setTurn(0);
    render();
    updateStatus();

    function updateStatus() {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) ctx.setStatus(`Đối thủ đang đi. ${log[0] || ""}`);
      else ctx.setStatus(`Người chơi ${turn + 1}: click ô cạnh nhân vật để khám phá, hoặc dùng bình máu/bóng tối để phá đối thủ.`);
    }

    return { applyMove };
  }

  window.GameRegistry.register({
    id: "dungeonrival",
    name: "Dungeon Rival",
    emoji: "🗝️",
    description: "Hai người đi dungeon riêng, nhặt đồ, lên cấp và dùng bóng tối gửi quái hoặc bẫy sang phá đối thủ.",
    onlineReady: true,
    options: [
      {
        id: "size",
        label: "Kích thước dungeon",
        default: 7,
        choices: [
          { value: 6, label: "6x6 (nhanh)" },
          { value: 7, label: "7x7" },
          { value: 8, label: "8x8 (lâu)" },
        ],
      },
      {
        id: "boss",
        label: "Cấp boss",
        default: 5,
        choices: [
          { value: 4, label: "Cấp 4" },
          { value: 5, label: "Cấp 5" },
          { value: 6, label: "Cấp 6" },
        ],
      },
      {
        id: "danger",
        label: "Độ nguy hiểm",
        default: "normal",
        choices: [
          { value: "easy", label: "Dễ" },
          { value: "normal", label: "Vừa" },
          { value: "hard", label: "Khó" },
        ],
      },
    ],
    howTo: [
      "Mỗi người có một dungeon riêng. Đến lượt mình, click một ô cạnh nhân vật để đi và mở phòng.",
      "Phòng có quái sẽ tự đánh theo chỉ số Công/Thủ. Thắng quái nhận XP, bóng tối và đôi khi có thêm đồ.",
      "Kho báu có thể cho kiếm, giáp, bình máu, hồi phục hoặc bóng tối. Đền thờ tăng max HP và hồi máu.",
      "Lên cấp sẽ tăng máu, công, đôi khi tăng thủ, và cho thêm bóng tối.",
      "Dùng bóng tối để gửi quái, gài bẫy hoặc gieo lời nguyền sang dungeon đối thủ.",
      "Đánh bại Chúa hầm trong dungeon của mình hoặc khiến đối thủ gục trước để thắng.",
    ],
    create,
  });
})();
