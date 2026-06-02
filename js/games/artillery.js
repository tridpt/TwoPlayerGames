/* Bắn Tăng (Artillery) — chơi chung máy & ONLINE (theo lượt)
   Mỗi lượt: chỉnh góc + lực, bắn một phát. Đạn bay theo trọng lực + gió.
   Địa hình và gió sinh từ hạt giống chung (ctx.rng) nên 2 máy mô phỏng giống hệt.
   Nước đi gửi qua mạng: { angle, power }. */
(function () {
  const W = 720, H = 440;
  const GRAV = 0.18;          // trọng lực mỗi khung
  const WIND_FACTOR = 0.018;  // ảnh hưởng của gió lên vận tốc ngang
  const STEP = 1;             // số bước mô phỏng mỗi khung (giữ tất định)

  // ----- các kiểu địa hình (map) tất định theo seed -----
  // Mỗi hàm trả về mảng độ cao ground[x]; nhận rng để giữ tất định.
  const MAPS = {
    hills(rng) { // đồi thoải gợn sóng (mặc định cũ)
      const baseY = H * 0.62;
      const a1 = 28 + rng() * 34, a2 = 14 + rng() * 22, a3 = 6 + rng() * 14;
      const p1 = rng() * 6.283, p2 = rng() * 6.283, p3 = rng() * 6.283;
      return fill((x) => {
        const t = (x / W) * Math.PI * 2;
        return baseY - a1 * Math.sin(t + p1) - a2 * Math.sin(t * 2.3 + p2) - a3 * Math.sin(t * 4.7 + p3);
      });
    },
    mountains(rng) { // núi cao lởm chởm
      const baseY = H * 0.68;
      const a1 = 50 + rng() * 30, a2 = 30 + rng() * 30, a3 = 18 + rng() * 20, a4 = 10 + rng() * 12;
      const p1 = rng() * 6.283, p2 = rng() * 6.283, p3 = rng() * 6.283, p4 = rng() * 6.283;
      return fill((x) => {
        const t = (x / W) * Math.PI * 2;
        return baseY - a1 * Math.sin(t * 1.3 + p1) - a2 * Math.sin(t * 2.9 + p2)
          - a3 * Math.sin(t * 5.1 + p3) - a4 * Math.sin(t * 8.3 + p4);
      });
    },
    valley(rng) { // thung lũng: cao hai bên, trũng giữa
      const edge = H * 0.42, mid = H * 0.78;
      const jitter = 8 + rng() * 10, jp = rng() * 6.283;
      return fill((x) => {
        const u = x / W;            // 0..1
        const bowl = Math.cos((u - 0.5) * Math.PI); // 1 ở giữa, 0 ở mép
        return edge + (mid - edge) * bowl - jitter * Math.sin(u * Math.PI * 6 + jp);
      });
    },
    hill(rng) { // đồi giữa: thấp hai bên, cao giữa (buộc bắn vòng cung)
      const edge = H * 0.74, peak = H * 0.36;
      const jitter = 6 + rng() * 8, jp = rng() * 6.283;
      return fill((x) => {
        const u = x / W;
        const bump = Math.exp(-Math.pow((u - 0.5) / 0.22, 2)); // gò chuông ở giữa
        return edge - (edge - peak) * bump - jitter * Math.sin(u * Math.PI * 5 + jp);
      });
    },
    plain(rng) { // đồng bằng gần phẳng, hơi gợn
      const baseY = H * 0.66;
      const a1 = 8 + rng() * 8, a2 = 4 + rng() * 6;
      const p1 = rng() * 6.283, p2 = rng() * 6.283;
      return fill((x) => {
        const t = (x / W) * Math.PI * 2;
        return baseY - a1 * Math.sin(t * 1.5 + p1) - a2 * Math.sin(t * 3.7 + p2);
      });
    },
  };
  const MAP_KEYS = ["hills", "mountains", "valley", "hill", "plain"];

  function fill(fn) {
    const arr = new Array(W + 1);
    for (let x = 0; x <= W; x++) {
      let h = fn(x);
      h = Math.max(H * 0.30, Math.min(H - 30, h));
      arr[x] = h;
    }
    return arr;
  }

  function create(ctx) {
    const o = ctx.options || {};
    const MAX_HP = o.hp || 100;
    const WIND_LEVEL = o.wind != null ? o.wind : 1; // 0 = lặng, 1 = vừa, 2 = mạnh
    const BLAST = o.blast || 60;     // bán kính nổ
    const MAX_DMG = o.dmg || 55;     // sát thương tối đa khi trúng tâm
    const MOVE_BUDGET = o.move != null ? o.move : 80; // số px được di chuyển mỗi lượt
    const MOVE_STEP = 5;             // mỗi lần bấm/nhấn dịch 5px
    const NUM_ITEMS = o.items != null ? o.items : 4; // số vật phẩm trên bản đồ
    const PICK_R = 22;               // bán kính nhặt vật phẩm

    // ----- chọn map (tất định theo seed) -----
    let mapKey = o.map || "hills";
    if (mapKey === "random") {
      mapKey = MAP_KEYS[Math.floor(ctx.rng() * MAP_KEYS.length)];
    }
    if (!MAPS[mapKey]) mapKey = "hills";
    const ground = MAPS[mapKey](ctx.rng);
    const terrainY = (x) => ground[Math.max(0, Math.min(W, Math.round(x)))];
    const STYLE = {
      hills:     { fill: "#3b7d4f", line: "#6ee7b7", sky0: "#1a1e3a", sky1: "#2a3060", name: "Đồi thoải" },
      mountains: { fill: "#6b5b4f", line: "#c9a98a", sky0: "#221a2e", sky1: "#3a2c40", name: "Núi lởm chởm" },
      valley:    { fill: "#3f6f7d", line: "#8be6f0", sky0: "#152030", sky1: "#1f3a4a", name: "Thung lũng" },
      hill:      { fill: "#7d6b3b", line: "#ffd166", sky0: "#2e2a1a", sky1: "#403a20", name: "Đồi giữa" },
      plain:     { fill: "#5a7d3b", line: "#b7e76e", sky0: "#1e2a18", sky1: "#2c4020", name: "Đồng bằng" },
    }[mapKey];

    // ----- gió tất định cho từng lượt -----
    function nextWind() {
      if (WIND_LEVEL === 0) return 0;
      const mag = WIND_LEVEL === 2 ? 2.2 : 1.2;
      return (ctx.rng() * 2 - 1) * mag;
    }
    let wind = nextWind();

    // ----- vật phẩm (power-up) sinh tất định theo seed -----
    // type: heal (hồi máu), bigshot (đạn nổ to), shield (giáp đỡ đòn kế),
    //       fuel (thêm nhiên liệu di chuyển)
    const ITEM_DEFS = {
      heal:    { icon: "❤️", color: "#6ee7b7", label: "Hồi máu +35" },
      bigshot: { icon: "💥", color: "#ffd166", label: "Đạn nổ lớn" },
      shield:  { icon: "🛡️", color: "#8be6f0", label: "Khiên đỡ đòn" },
      fuel:    { icon: "⛽", color: "#c9a98a", label: "Nạp nhiên liệu" },
    };
    const ITEM_KEYS = ["heal", "bigshot", "shield", "fuel"];
    const items = []; // { id, x, y, type, taken }
    for (let i = 0; i < NUM_ITEMS; i++) {
      // đặt ở khoảng giữa bản đồ (tránh ngay trên đầu 2 xe)
      const ix = Math.round(W * (0.25 + ctx.rng() * 0.5));
      const type = ITEM_KEYS[Math.floor(ctx.rng() * ITEM_KEYS.length)];
      items.push({ id: i, x: ix, y: 0, type, taken: false });
    }
    // đặt vật phẩm "nổi" hơi cao trên mặt đất để xe chạy qua là nhặt
    items.forEach((it) => { it.y = terrainY(it.x) - 14; });

    // ----- xe tăng -----
    const players = [
      { x: W * 0.12, hp: MAX_HP, color: "#ff5d73", dir: 1, angle: 50, power: 60, shield: false, bigshot: false },
      { x: W * 0.88, hp: MAX_HP, color: "#4dd0e1", dir: -1, angle: 50, power: 60, shield: false, bigshot: false },
    ];
    let turn = 0;
    let busy = false;   // đang bay đạn
    let over = false;
    let proj = null;
    let explosion = null;
    let raf = null;
    let fuel = MOVE_BUDGET; // nhiên liệu di chuyển còn lại trong lượt
    let pickedThisTurn = []; // id vật phẩm đã nhặt trong lượt hiện tại

    // ----- canvas -----
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "art-canvas";
    ctx.boardEl.appendChild(canvas);
    const g = canvas.getContext("2d");

    // ----- bảng điều khiển -----
    const panel = document.createElement("div");
    panel.className = "art-controls";
    panel.innerHTML =
      `<div class="art-field art-move"><label>Di chuyển</label>` +
      `<button class="btn small" id="artLeft">◄</button>` +
      `<button class="btn small" id="artRight">►</button>` +
      `<span class="art-val" id="artFuelVal"></span></div>` +
      `<div class="art-field"><label>Góc</label>` +
      `<input type="range" id="artAngle" min="5" max="85" value="50">` +
      `<span class="art-val" id="artAngleVal">50°</span></div>` +
      `<div class="art-field"><label>Lực</label>` +
      `<input type="range" id="artPower" min="20" max="100" value="60">` +
      `<span class="art-val" id="artPowerVal">60</span></div>` +
      `<button class="btn primary" id="artFire">💥 Bắn</button>`;
    ctx.boardEl.appendChild(panel);

    const angleInput = panel.querySelector("#artAngle");
    const powerInput = panel.querySelector("#artPower");
    const angleVal = panel.querySelector("#artAngleVal");
    const powerVal = panel.querySelector("#artPowerVal");
    const fireBtn = panel.querySelector("#artFire");
    const leftBtn = panel.querySelector("#artLeft");
    const rightBtn = panel.querySelector("#artRight");
    const fuelVal = panel.querySelector("#artFuelVal");

    angleInput.addEventListener("input", () => {
      players[turn].angle = +angleInput.value;
      angleVal.textContent = angleInput.value + "°";
      draw();
    });
    powerInput.addEventListener("input", () => {
      players[turn].power = +powerInput.value;
      powerVal.textContent = powerInput.value;
      draw();
    });
    fireBtn.addEventListener("click", fire);

    // nhặt vật phẩm mà xe (ở vị trí px) chạm tới; trả về danh sách id vừa nhặt
    function collectItems(pl) {
      const picked = [];
      const py = terrainY(pl.x) - 10;
      items.forEach((it) => {
        if (it.taken) return;
        if (Math.hypot(it.x - pl.x, it.y - py) < PICK_R) {
          it.taken = true;
          picked.push(it.id);
          applyItemEffect(pl, it.type);
        }
      });
      if (picked.length) pickedThisTurn.push(...picked);
      return picked;
    }

    // áp dụng vật phẩm theo danh sách id (dùng khi nhận nước đi từ xa)
    function applyItemsById(pl, ids) {
      ids.forEach((id) => {
        const it = items[id];
        if (it && !it.taken) { it.taken = true; applyItemEffect(pl, it.type, true); }
      });
    }

    function applyItemEffect(pl, type, silent) {
      switch (type) {
        case "heal": pl.hp = Math.min(MAX_HP, pl.hp + 35); break;
        case "bigshot": pl.bigshot = true; break;
        case "shield": pl.shield = true; break;
        case "fuel": fuel += 120; break;
      }
      if (!silent) {
        ctx.sound("select");
        flashItem = { type, t: 60 };
      }
    }
    let flashItem = null;

    // di chuyển xe trong lượt (tốn nhiên liệu, không cho ra mép)
    function moveTank(delta) {
      if (busy || over || !myTurn() || fuel <= 0) return;
      const pl = players[turn];
      const minX = 24, maxX = W - 24;
      const want = Math.max(-fuel, Math.min(fuel, delta));
      let nx = pl.x + want;
      nx = Math.max(minX, Math.min(maxX, nx));
      const used = Math.abs(nx - pl.x);
      if (used <= 0) return;
      pl.x = nx;
      fuel -= used;
      collectItems(pl); // nhặt vật phẩm khi chạy qua
      ctx.sound("select");
      syncControls();
      draw();
    }
    leftBtn.addEventListener("click", () => moveTank(-MOVE_STEP));
    rightBtn.addEventListener("click", () => moveTank(MOVE_STEP));

    // hỗ trợ phím mũi tên trái/phải để di chuyển cho mượt
    function onKey(e) {
      if (e.key === "ArrowLeft") { moveTank(-MOVE_STEP); e.preventDefault(); }
      else if (e.key === "ArrowRight") { moveTank(MOVE_STEP); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);

    function myTurn() { return !ctx.isOnline || turn === ctx.mySeat; }

    function syncControls() {
      const pl = players[turn];
      angleInput.value = pl.angle;
      powerInput.value = pl.power;
      angleVal.textContent = pl.angle + "°";
      powerVal.textContent = pl.power;
      const lock = busy || over || !myTurn();
      angleInput.disabled = lock;
      powerInput.disabled = lock;
      fireBtn.disabled = lock;
      leftBtn.disabled = lock || fuel <= 0;
      rightBtn.disabled = lock || fuel <= 0;
      fuelVal.textContent = MOVE_BUDGET > 0 ? `⛽ ${Math.round(fuel)}` : "";
    }

    function barrelTip(pl) {
      const cx = pl.x, cy = terrainY(pl.x) - 10;
      const rad = pl.angle * Math.PI / 180;
      return { x: cx + pl.dir * Math.cos(rad) * 26, y: cy - Math.sin(rad) * 26, cx, cy };
    }

    function fire() {
      if (busy || over || !myTurn()) return;
      const pl = players[turn];
      applyMove({ angle: pl.angle, power: pl.power, x: pl.x }, false);
    }

    function applyMove(move, fromRemote) {
      if (busy || over) return;
      const pl = players[turn];
      pl.angle = Math.max(5, Math.min(85, move.angle));
      pl.power = Math.max(20, Math.min(100, move.power));
      // đồng bộ vị trí xe (đối thủ đã di chuyển trong lượt của họ)
      if (typeof move.x === "number") pl.x = Math.max(24, Math.min(W - 24, move.x));
      // tái hiện chính xác các vật phẩm đối thủ đã nhặt (theo id)
      if (fromRemote && Array.isArray(move.items)) applyItemsById(pl, move.items);

      if (!fromRemote && ctx.isOnline) {
        ctx.sendMove({ angle: pl.angle, power: pl.power, x: pl.x, items: pickedThisTurn.slice() });
      }

      // đạn nổ lớn nếu xe đang có power-up bigshot (dùng 1 lần)
      const blastNow = pl.bigshot ? BLAST * 1.7 : BLAST;
      const dmgNow = pl.bigshot ? MAX_DMG * 1.5 : MAX_DMG;
      pl.bigshot = false;

      const tip = barrelTip(pl);
      const rad = pl.angle * Math.PI / 180;
      const v = pl.power * 0.22;
      proj = {
        x: tip.x, y: tip.y,
        vx: pl.dir * v * Math.cos(rad),
        vy: -v * Math.sin(rad),
        blast: blastNow, dmg: dmgNow,
      };
      busy = true;
      ctx.sound("shot");
      syncControls();
    }

    function stepProjectile() {
      if (!proj) return;
      for (let s = 0; s < STEP; s++) {
        proj.vx += wind * WIND_FACTOR;
        proj.vy += GRAV;
        proj.x += proj.vx;
        proj.y += proj.vy;

        // ra khỏi 2 bên hoặc rơi quá đáy -> trượt
        if (proj.x < -40 || proj.x > W + 40 || proj.y > H + 40) {
          return resolve(null);
        }
        // trúng địa hình
        if (proj.y >= terrainY(proj.x)) {
          return resolve({ x: proj.x, y: terrainY(proj.x) });
        }
        // trúng trực tiếp xe tăng đối thủ
        const foe = players[1 - turn];
        const fy = terrainY(foe.x) - 10;
        if (Math.hypot(proj.x - foe.x, proj.y - fy) < 16) {
          return resolve({ x: proj.x, y: proj.y });
        }
      }
    }

    function resolve(impact) {
      const blast = (proj && proj.blast) || BLAST;
      const maxDmg = (proj && proj.dmg) || MAX_DMG;
      proj = null;
      if (impact) {
        explosion = { x: impact.x, y: impact.y, r: 4, max: blast };
        ctx.sound("capture");
        // sát thương theo khoảng cách tới từng xe
        players.forEach((pl) => {
          const py = terrainY(pl.x) - 10;
          const d = Math.hypot(impact.x - pl.x, impact.y - py);
          if (d < blast) {
            let dmg = Math.round(maxDmg * (1 - d / blast));
            if (pl.shield && dmg > 0) { dmg = Math.round(dmg * 0.4); pl.shield = false; } // khiên giảm 60%
            pl.hp = Math.max(0, pl.hp - dmg);
          }
        });
      } else {
        ctx.sound("miss");
      }

      // kiểm tra kết thúc
      const dead0 = players[0].hp <= 0, dead1 = players[1].hp <= 0;
      if (dead0 || dead1) {
        over = true;
        if (dead0 && dead1) { ctx.setStatus("🤝 Cả hai cùng nổ tung — hòa!"); }
        else {
          const w = dead0 ? 1 : 0;
          ctx.incScore(w);
          ctx.setStatus(`🎉 Người chơi ${w + 1} chiến thắng!`);
        }
        ctx.setTurn(-1);
        syncControls();
        return;
      }

      // sang lượt đối thủ
      turn = 1 - turn;
      wind = nextWind();
      fuel = MOVE_BUDGET; // nạp lại nhiên liệu di chuyển cho lượt mới
      pickedThisTurn = []; // reset danh sách vật phẩm nhặt cho lượt mới
      busy = false;
      ctx.setTurn(turn);
      updateStatus();
      syncControls();
    }

    function updateStatus() {
      const dirTxt = wind === 0 ? "lặng gió"
        : (wind > 0 ? "→ " : "← ") + Math.abs(wind).toFixed(1);
      const moveTxt = MOVE_BUDGET > 0 ? " Di chuyển (◄ ►) rồi" : "";
      ctx.setStatus(`Lượt Người chơi ${turn + 1}. Gió: ${dirTxt}.${moveTxt} chỉnh góc/lực rồi bắn.`);
    }

    function draw() {
      // trời
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, STYLE.sky0);
      sky.addColorStop(1, STYLE.sky1);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // địa hình
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x++) g.lineTo(x, ground[x]);
      g.lineTo(W, H);
      g.closePath();
      g.fillStyle = STYLE.fill;
      g.fill();
      g.strokeStyle = STYLE.line;
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= W; x++) (x === 0 ? g.moveTo(x, ground[x]) : g.lineTo(x, ground[x]));
      g.stroke();

      // vật phẩm chưa nhặt
      items.forEach((it) => {
        if (it.taken) return;
        const def = ITEM_DEFS[it.type];
        // bệ tròn
        g.fillStyle = def.color;
        g.globalAlpha = 0.25;
        g.beginPath();
        g.arc(it.x, it.y, 14, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        g.font = "18px serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(def.icon, it.x, it.y);
        g.textBaseline = "alphabetic";
      });

      // xe tăng + thanh máu + nòng
      players.forEach((pl, i) => {
        const y = terrainY(pl.x);
        // thân
        g.fillStyle = pl.color;
        g.fillRect(pl.x - 16, y - 12, 32, 12);
        g.beginPath();
        g.arc(pl.x, y - 12, 9, Math.PI, 0);
        g.fill();
        // nòng
        const tip = barrelTip(pl);
        g.strokeStyle = pl.color;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(tip.cx, tip.cy);
        g.lineTo(tip.x, tip.y);
        g.stroke();
        // thanh máu
        const bw = 40, bx = pl.x - bw / 2, by = y - 34;
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(bx, by, bw, 6);
        g.fillStyle = pl.hp > MAX_HP * 0.3 ? "#6ee7b7" : "#ff5d73";
        g.fillRect(bx, by, bw * (pl.hp / MAX_HP), 6);
        g.fillStyle = "#fff";
        g.font = "11px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(`P${i + 1}: ${pl.hp}`, pl.x, by - 4);
        // huy hiệu power-up đang giữ
        const badges = [];
        if (pl.shield) badges.push("🛡️");
        if (pl.bigshot) badges.push("💥");
        if (badges.length) {
          g.font = "14px serif";
          g.fillText(badges.join(" "), pl.x, by - 16);
        }
      });

      // đạn
      if (proj) {
        g.fillStyle = "#ffd166";
        g.beginPath();
        g.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        g.fill();
      }
      // nổ
      if (explosion) {
        g.fillStyle = `rgba(255,140,60,${1 - explosion.r / explosion.max})`;
        g.beginPath();
        g.arc(explosion.x, explosion.y, explosion.r, 0, Math.PI * 2);
        g.fill();
      }

      // chỉ báo gió + tên map góc trên
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.font = "13px Segoe UI, sans-serif";
      g.textAlign = "center";
      const wtxt = wind === 0 ? "Gió: lặng"
        : "Gió " + (wind > 0 ? "→" : "←") + " " + Math.abs(wind).toFixed(1);
      g.fillText(wtxt, W / 2, 22);
      g.textAlign = "left";
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillText("🗺️ " + STYLE.name, 12, 22);

      // thông báo vừa nhặt vật phẩm
      if (flashItem && flashItem.t > 0) {
        const def = ITEM_DEFS[flashItem.type];
        g.globalAlpha = Math.min(1, flashItem.t / 30);
        g.fillStyle = def.color;
        g.font = "bold 20px Segoe UI, sans-serif";
        g.textAlign = "center";
        g.fillText(`${def.icon} ${def.label}!`, W / 2, H * 0.4);
        g.globalAlpha = 1;
      }
    }

    function loop() {
      if (busy && proj) stepProjectile();
      if (explosion) {
        explosion.r += 3;
        if (explosion.r >= explosion.max) explosion = null;
      }
      if (flashItem && flashItem.t > 0) flashItem.t--;
      draw();
      raf = requestAnimationFrame(loop);
    }

    // cleanup khi rời game
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", onKey);
        observer.disconnect();
      }
    });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    ctx.setTurn(0);
    updateStatus();
    syncControls();
    draw();
    raf = requestAnimationFrame(loop);
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "artillery",
    name: "Bắn Tăng (Artillery)",
    emoji: "💣",
    description: "Chỉnh góc và lực bắn, tính cả sức gió, để nã trúng xe tăng đối thủ. Theo lượt, chơi cả online.",
    onlineReady: true,
    options: [
      {
        id: "map", label: "Địa hình", default: "hills",
        choices: [
          { value: "hills", label: "Đồi thoải" },
          { value: "mountains", label: "Núi lởm chởm" },
          { value: "valley", label: "Thung lũng" },
          { value: "hill", label: "Đồi giữa" },
          { value: "plain", label: "Đồng bằng" },
          { value: "random", label: "🎲 Ngẫu nhiên" },
        ],
      },
      {
        id: "wind", label: "Sức gió", default: 1,
        choices: [
          { value: 0, label: "Lặng gió (dễ)" },
          { value: 1, label: "Gió vừa" },
          { value: 2, label: "Gió mạnh (khó)" },
        ],
      },
      {
        id: "hp", label: "Máu mỗi xe", default: 100,
        choices: [
          { value: 60, label: "60 (nhanh)" },
          { value: 100, label: "100 (chuẩn)" },
          { value: 150, label: "150 (lâu)" },
        ],
      },
      {
        id: "move", label: "Di chuyển mỗi lượt", default: 80,
        choices: [
          { value: 0, label: "Cố định (không di chuyển)" },
          { value: 80, label: "Ít (80px)" },
          { value: 150, label: "Vừa (150px)" },
          { value: 250, label: "Nhiều (250px)" },
        ],
      },
      {
        id: "items", label: "Vật phẩm", default: 4,
        choices: [
          { value: 0, label: "Tắt (không có)" },
          { value: 4, label: "Ít (4)" },
          { value: 7, label: "Nhiều (7)" },
        ],
      },
    ],
    howTo: [
      "Hai xe tăng ở hai đầu địa hình. Người chơi 1 (đỏ) bên trái, Người chơi 2 (xanh) bên phải. Chơi theo lượt.",
      "Đến lượt mình, bạn có thể DI CHUYỂN xe bằng nút ◄ ► (hoặc phím mũi tên trái/phải) — mỗi lượt có một lượng nhiên liệu ⛽ giới hạn.",
      "Trên bản đồ có VẬT PHẨM — chạy xe qua để nhặt: ❤️ hồi máu, 💥 đạn nổ lớn (phát kế gây sát thương mạnh hơn), 🛡️ khiên (đỡ 60% sát thương đòn kế), ⛽ nạp thêm nhiên liệu di chuyển.",
      "Sau khi đã chọn vị trí, kéo thanh 'Góc' và 'Lực' để ngắm, rồi bấm 💥 Bắn.",
      "Đạn bay theo trọng lực VÀ sức gió (xem chỉ báo gió phía trên) — gió đổi mỗi lượt nên phải tính toán lại.",
      "Bắn trúng gần xe đối thủ sẽ gây sát thương; càng trúng gần tâm càng đau. Trúng trực tiếp thì cực mạnh.",
      "Có 5 kiểu địa hình — chọn ở màn chế độ, hoặc để 🎲 ngẫu nhiên mỗi ván.",
      "Xe nào hết máu trước sẽ thua. Chơi online: mọi lựa chọn và vật phẩm đều đồng bộ từ chủ phòng.",
    ],
    create,
  });
})();
