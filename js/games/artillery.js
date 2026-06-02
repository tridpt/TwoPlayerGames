/* Bắn Tăng (Artillery) — chơi chung máy & ONLINE (theo lượt)
   Mỗi lượt: chỉnh góc + lực, bắn một phát. Đạn bay theo trọng lực + gió.
   Địa hình và gió sinh từ hạt giống chung (ctx.rng) nên 2 máy mô phỏng giống hệt.
   Nước đi gửi qua mạng: { angle, power }. */
(function () {
  const W = 720, H = 440;
  const GRAV = 0.18;          // trọng lực mỗi khung
  const WIND_FACTOR = 0.018;  // ảnh hưởng của gió lên vận tốc ngang
  const STEP = 1;             // số bước mô phỏng mỗi khung (giữ tất định)

  function create(ctx) {
    const o = ctx.options || {};
    const MAX_HP = o.hp || 100;
    const WIND_LEVEL = o.wind != null ? o.wind : 1; // 0 = lặng, 1 = vừa, 2 = mạnh
    const BLAST = o.blast || 60;     // bán kính nổ
    const MAX_DMG = o.dmg || 55;     // sát thương tối đa khi trúng tâm

    // ----- địa hình tất định (mảng độ cao theo x) -----
    const baseY = H * 0.62;
    const a1 = 28 + ctx.rng() * 34, a2 = 14 + ctx.rng() * 22, a3 = 6 + ctx.rng() * 14;
    const p1 = ctx.rng() * 6.283, p2 = ctx.rng() * 6.283, p3 = ctx.rng() * 6.283;
    const ground = new Array(W + 1);
    for (let x = 0; x <= W; x++) {
      const t = (x / W) * Math.PI * 2;
      let h = baseY
        - a1 * Math.sin(t * 1.0 + p1)
        - a2 * Math.sin(t * 2.3 + p2)
        - a3 * Math.sin(t * 4.7 + p3);
      h = Math.max(H * 0.35, Math.min(H - 30, h));
      ground[x] = h;
    }
    const terrainY = (x) => ground[Math.max(0, Math.min(W, Math.round(x)))];

    // ----- gió tất định cho từng lượt -----
    function nextWind() {
      if (WIND_LEVEL === 0) return 0;
      const mag = WIND_LEVEL === 2 ? 2.2 : 1.2;
      return (ctx.rng() * 2 - 1) * mag;
    }
    let wind = nextWind();

    // ----- xe tăng -----
    const players = [
      { x: W * 0.12, hp: MAX_HP, color: "#ff5d73", dir: 1, angle: 50, power: 60 },
      { x: W * 0.88, hp: MAX_HP, color: "#4dd0e1", dir: -1, angle: 50, power: 60 },
    ];
    let turn = 0;
    let busy = false;   // đang bay đạn
    let over = false;
    let proj = null;
    let explosion = null;
    let raf = null;

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
    }

    function barrelTip(pl) {
      const cx = pl.x, cy = terrainY(pl.x) - 10;
      const rad = pl.angle * Math.PI / 180;
      return { x: cx + pl.dir * Math.cos(rad) * 26, y: cy - Math.sin(rad) * 26, cx, cy };
    }

    function fire() {
      if (busy || over || !myTurn()) return;
      applyMove({ angle: players[turn].angle, power: players[turn].power }, false);
    }

    function applyMove(move, fromRemote) {
      if (busy || over) return;
      const pl = players[turn];
      pl.angle = Math.max(5, Math.min(85, move.angle));
      pl.power = Math.max(20, Math.min(100, move.power));

      if (!fromRemote && ctx.isOnline) ctx.sendMove({ angle: pl.angle, power: pl.power });

      const tip = barrelTip(pl);
      const rad = pl.angle * Math.PI / 180;
      const v = pl.power * 0.22;
      proj = {
        x: tip.x, y: tip.y,
        vx: pl.dir * v * Math.cos(rad),
        vy: -v * Math.sin(rad),
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
      proj = null;
      if (impact) {
        explosion = { x: impact.x, y: impact.y, r: 4, max: BLAST };
        ctx.sound("capture");
        // sát thương theo khoảng cách tới từng xe
        players.forEach((pl) => {
          const py = terrainY(pl.x) - 10;
          const d = Math.hypot(impact.x - pl.x, impact.y - py);
          if (d < BLAST) {
            const dmg = Math.round(MAX_DMG * (1 - d / BLAST));
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
      busy = false;
      ctx.setTurn(turn);
      updateStatus();
      syncControls();
    }

    function updateStatus() {
      const dirTxt = wind === 0 ? "lặng gió"
        : (wind > 0 ? "→ " : "← ") + Math.abs(wind).toFixed(1);
      ctx.setStatus(`Lượt Người chơi ${turn + 1}. Gió: ${dirTxt}. Chỉnh góc/lực rồi bắn.`);
    }

    function draw() {
      // trời
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#1a1e3a");
      sky.addColorStop(1, "#2a3060");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // địa hình
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x++) g.lineTo(x, ground[x]);
      g.lineTo(W, H);
      g.closePath();
      g.fillStyle = "#3b7d4f";
      g.fill();
      g.strokeStyle = "#6ee7b7";
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= W; x++) (x === 0 ? g.moveTo(x, ground[x]) : g.lineTo(x, ground[x]));
      g.stroke();

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

      // chỉ báo gió góc trên
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.font = "13px Segoe UI, sans-serif";
      g.textAlign = "center";
      const wtxt = wind === 0 ? "Gió: lặng"
        : "Gió " + (wind > 0 ? "→" : "←") + " " + Math.abs(wind).toFixed(1);
      g.fillText(wtxt, W / 2, 22);
    }

    function loop() {
      if (busy && proj) stepProjectile();
      if (explosion) {
        explosion.r += 3;
        if (explosion.r >= explosion.max) explosion = null;
      }
      draw();
      raf = requestAnimationFrame(loop);
    }

    // cleanup khi rời game
    const observer = new MutationObserver(() => {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(raf); observer.disconnect(); }
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
    ],
    howTo: [
      "Hai xe tăng ở hai đầu địa hình. Người chơi 1 (đỏ) bên trái, Người chơi 2 (xanh) bên phải. Chơi theo lượt.",
      "Đến lượt mình, kéo thanh 'Góc' và 'Lực' để ngắm, rồi bấm 💥 Bắn.",
      "Đạn bay theo trọng lực VÀ sức gió (xem chỉ báo gió phía trên) — gió đổi mỗi lượt nên phải tính toán lại.",
      "Bắn trúng gần xe đối thủ sẽ gây sát thương; càng trúng gần tâm càng đau. Trúng trực tiếp thì cực mạnh.",
      "Xe nào hết máu trước sẽ thua. Chơi online: lựa chọn của chủ phòng (gió, máu) áp dụng cho cả hai.",
    ],
    create,
  });
})();
