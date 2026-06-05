/* Câu Cá Đối Đầu (Fishing Frenzy) — ONLINE song song.
   Hai người câu trên hồ riêng trong thời gian định sẵn, ai nhiều điểm cá hơn thì thắng.
   Cơ chế: bấm chuột nhắm vào cá để móc, rồi BẤM PHÍM CÁCH liên tục để kéo lên
   (cá càng nặng tụt càng nhanh, phải bấm nhanh hơn). Có vật phẩm phải câu mới nhận.
   Chỉ relay điểm — không cần đồng bộ từng con cá. Giao thức:
     { kind:"ready" }
     { kind:"score", score, count }
     { kind:"final", score, count } */
(function () {
  const FISH = [
    { emoji: "🐟", name: "Cá rô", weight: 1, pts: 1, rate: 30, speed: 60, r: 15 },
    { emoji: "🐠", name: "Cá nhiệt đới", weight: 1, pts: 2, rate: 22, speed: 85, r: 15 },
    { emoji: "🐡", name: "Cá nóc", weight: 2, pts: 3, rate: 14, speed: 50, r: 17 },
    { emoji: "🦑", name: "Mực", weight: 2, pts: 3, rate: 11, speed: 95, r: 17 },
    { emoji: "🐙", name: "Bạch tuộc", weight: 3, pts: 4, rate: 8, speed: 55, r: 19 },
    { emoji: "🐬", name: "Cá heo", weight: 3, pts: 5, rate: 5, speed: 120, r: 22 },
    { emoji: "🦈", name: "Cá mập", weight: 5, pts: 9, rate: 3, speed: 80, r: 26 },
  ];
  const ITEMS = [
    { emoji: "🪱", name: "Mồi xịn", kind: "bait", rate: 7, r: 13 },
    { emoji: "⭐", name: "Sao x2", kind: "star", rate: 5, r: 14 },
    { emoji: "🧲", name: "Nam châm", kind: "magnet", rate: 4, r: 14 },
    { emoji: "💎", name: "Ngọc biển", kind: "gem", rate: 3, r: 14 },
    { emoji: "🥾", name: "Giày rách", kind: "junk", rate: 5, r: 14 },
  ];
  const REEL_KEY_LABEL = "PHÍM CÁCH";

  function create(ctx) {
    const o = ctx.options || {};
    const DURATION = o.duration || 60;
    const W = 460, H = 320;
    const WATER_TOP = 40;

    let phase = ctx.isOnline ? "connect" : "countdown"; // connect|countdown|play|over
    let iReady = false, oppReady = false;
    let countdown = 3;
    let timeLeft = DURATION;
    let myScore = 0, myCount = 0;
    let oppScore = 0, oppCount = 0;
    let myDone = false, oppDone = false, decided = false;

    const fishes = [];
    const items = [];
    let nextId = 1;
    let hooked = null;       // entity đang kéo
    let progress = 0;        // 0..100
    let reelTimeLeft = 0;
    let baitNext = false;    // mồi xịn: kéo dễ hơn
    let starNext = false;    // sao: x2 điểm con cá kế
    let magnetNext = false;  // nam châm: tự kéo con cá kế
    let castMsg = "";
    let castMsgT = 0;

    let raf = null, lastT = 0, timerInt = null, cdInt = null, spawnAcc = 0, itemAcc = 0;

    // ----- UI -----
    const root = document.createElement("div");
    root.className = "fh-root";
    ctx.boardEl.appendChild(root);

    const top = document.createElement("div");
    top.className = "fh-top";
    root.appendChild(top);

    const wrap = document.createElement("div");
    wrap.className = "fh-canvas-wrap";
    const canvas = document.createElement("canvas");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.className = "fh-canvas";
    wrap.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.scale(DPR, DPR);
    root.appendChild(wrap);

    const reel = document.createElement("div");
    reel.className = "fh-reel fh-hidden";
    root.appendChild(reel);

    const boosts = document.createElement("div");
    boosts.className = "fh-boosts";
    root.appendChild(boosts);

    const hint = document.createElement("div");
    hint.className = "fh-hint";
    hint.textContent = "Bấm vào con cá để móc, rồi bấm " + REEL_KEY_LABEL + " liên tục để kéo lên.";
    root.appendChild(hint);

    function rng() { return Math.random(); }
    function pickWeighted(list) {
      const total = list.reduce((s, x) => s + x.rate, 0);
      let r = rng() * total;
      for (const it of list) { if ((r -= it.rate) <= 0) return it; }
      return list[0];
    }

    // ====================== SPAWN & MOVE ======================
    function spawnFish() {
      if (fishes.length >= 8) return;
      const def = pickWeighted(FISH);
      const dir = rng() < 0.5 ? 1 : -1;
      const x = dir === 1 ? -20 : W + 20;
      const y = WATER_TOP + 20 + rng() * (H - WATER_TOP - 50);
      fishes.push({ id: nextId++, kind: "fish", def, x, y, dir, vy: (rng() - 0.5) * 12, t: rng() * 6 });
    }
    function spawnItem() {
      if (items.length >= 2) return;
      const def = pickWeighted(ITEMS);
      const dir = rng() < 0.5 ? 1 : -1;
      const x = dir === 1 ? -20 : W + 20;
      const y = WATER_TOP + 20 + rng() * (H - WATER_TOP - 50);
      items.push({ id: nextId++, kind: "item", def, x, y, dir, vy: (rng() - 0.5) * 8, t: rng() * 6 });
    }

    function moveEntity(e, dt) {
      if (hooked && hooked.id === e.id) return; // đang bị kéo thì không tự bơi
      e.x += e.dir * e.def.speed * dt;
      e.t += dt;
      e.y += Math.sin(e.t * 1.6) * e.vy * dt;
      e.y = Math.max(WATER_TOP + 14, Math.min(H - 18, e.y));
    }
    function offscreen(e) { return e.x < -40 || e.x > W + 40; }

    // ====================== INPUT ======================
    canvas.addEventListener("click", (e) => {
      if (phase !== "play" || hooked) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W / rect.width);
      const y = (e.clientY - rect.top) * (H / rect.height);
      const all = [...fishes, ...items];
      let best = null, bestD = Infinity;
      for (const ent of all) {
        const d = Math.hypot(ent.x - x, ent.y - y);
        if (d < ent.def.r + 16 && d < bestD) { best = ent; bestD = d; }
      }
      if (!best) { flash("Trượt! Nhắm vào con cá."); ctx.sound("miss"); return; }
      startReel(best);
    });

    function startReel(ent) {
      hooked = ent;
      ctx.sound("select");
      if (ent.kind === "fish" && magnetNext) {
        magnetNext = false;
        flash("🧲 Nam châm kéo dính!");
        return catchEntity(ent);
      }
      const w = ent.kind === "item" ? 1 : ent.def.weight;
      progress = 36 - w * 2;
      reelTimeLeft = 11;
      reel.classList.remove("fh-hidden");
      renderReel();
    }

    function onKey(e) {
      if (!document.body.contains(root)) { teardown(); return; }
      if ((e.key === " " || e.code === "Space" || e.key === "Spacebar")) {
        if (phase === "play" && hooked) e.preventDefault();
        if (e.repeat) return; // chống giữ phím — phải bấm liên tục
        if (phase !== "play" || !hooked) return;
        const w = hooked.kind === "item" ? 1 : hooked.def.weight;
        const gain = (baitNext ? 16 : 10) - (w >= 5 ? 1 : 0);
        progress = Math.min(100, progress + gain);
        ctx.sound("place");
        renderReel();
        if (progress >= 100) catchEntity(hooked);
      }
    }
    document.addEventListener("keydown", onKey);

    function catchEntity(ent) {
      removeEntity(ent);
      hooked = null;
      reel.classList.add("fh-hidden");
      if (baitNext) baitNext = false;
      if (ent.kind === "item") {
        applyItem(ent.def);
      } else {
        let pts = ent.def.pts;
        if (starNext) { pts *= 2; starNext = false; flash(`⭐ x2 ${ent.def.name}! +${pts}`); }
        else flash(`Bắt được ${ent.def.emoji} ${ent.def.name}! +${pts}`);
        myScore += pts;
        myCount += 1;
        ctx.sound("capture");
      }
      relayScore();
      renderTop();
      renderBoosts();
    }

    function applyItem(def) {
      if (def.kind === "bait") { baitNext = true; flash("🪱 Mồi xịn: con cá kế kéo dễ hơn!"); }
      else if (def.kind === "star") { starNext = true; flash("⭐ Sao x2: con cá kế gấp đôi điểm!"); }
      else if (def.kind === "magnet") { magnetNext = true; flash("🧲 Nam châm: con cá kế tự dính!"); }
      else if (def.kind === "gem") { myScore += 6; flash("💎 Ngọc biển! +6 điểm"); }
      else { flash("🥾 Giày rách... chẳng được gì."); }
      ctx.sound(def.kind === "junk" ? "miss" : "capture");
    }

    function escapeHooked() {
      if (!hooked) return;
      flash(hooked.kind === "item" ? "Vuột mất vật phẩm!" : `${hooked.def.emoji} sổng mất rồi!`);
      ctx.sound("miss");
      if (hooked.dir) hooked.dir = rng() < 0.5 ? 1 : -1;
      hooked = null;
      reel.classList.add("fh-hidden");
      if (baitNext) baitNext = false;
    }

    function removeEntity(ent) {
      const arr = ent.kind === "fish" ? fishes : items;
      const i = arr.indexOf(ent);
      if (i >= 0) arr.splice(i, 1);
    }

    function flash(msg) { castMsg = msg; castMsgT = 1.6; }

    // ====================== VÒNG LẶP ======================
    function loop(now) {
      if (!document.body.contains(root)) { teardown(); return; }
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0);
      lastT = now;

      if (phase === "play") {
        spawnAcc += dt; itemAcc += dt;
        if (spawnAcc > 0.9) { spawnAcc = 0; if (rng() < 0.85) spawnFish(); }
        if (itemAcc > 4.5) { itemAcc = 0; if (rng() < 0.7) spawnItem(); }
        fishes.forEach((f) => moveEntity(f, dt));
        items.forEach((f) => moveEntity(f, dt));
        for (let i = fishes.length - 1; i >= 0; i--) if (offscreen(fishes[i]) && fishes[i] !== hooked) fishes.splice(i, 1);
        for (let i = items.length - 1; i >= 0; i--) if (offscreen(items[i]) && items[i] !== hooked) items.splice(i, 1);

        if (hooked) {
          const w = hooked.kind === "item" ? 1 : hooked.def.weight;
          const decay = (baitNext ? 4 : 6) + w * 5;
          progress -= decay * dt;
          reelTimeLeft -= dt;
          if (progress <= 0 || reelTimeLeft <= 0) escapeHooked();
          else renderReel();
        }
      }
      if (castMsgT > 0) castMsgT -= dt;
      draw();
      raf = requestAnimationFrame(loop);
    }

    // ====================== VẼ ======================
    function draw() {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0a2a4a");
      grad.addColorStop(0.18, "#0e3e63");
      grad.addColorStop(1, "#06223b");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      // mặt nước
      g.fillStyle = "rgba(120,200,255,0.10)";
      g.fillRect(0, WATER_TOP - 6, W, 6);
      // thuyền + cần ở trên
      g.font = "26px 'Segoe UI Emoji', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("🛶", W / 2, 18);

      // dây câu
      if (hooked) {
        g.strokeStyle = "rgba(255,255,255,0.5)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(W / 2, 28);
        g.lineTo(hooked.x, hooked.y);
        g.stroke();
      }

      drawEntities(items);
      drawEntities(fishes);

      if (phase === "countdown") {
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#ffd166";
        g.font = "900 64px Segoe UI, sans-serif";
        g.fillText(countdown > 0 ? String(countdown) : "CÂU!", W / 2, H / 2);
      } else if (phase === "connect") {
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "#e9ecff";
        g.font = "800 20px Segoe UI, sans-serif";
        g.fillText("Đang chờ đối thủ...", W / 2, H / 2);
      }

      if (castMsgT > 0 && phase === "play") {
        g.fillStyle = "rgba(8,14,28,0.78)";
        const tw = g.measureText(castMsg).width;
        g.font = "800 14px Segoe UI, sans-serif";
        const w2 = g.measureText(castMsg).width + 20;
        roundRect(g, W / 2 - w2 / 2, H - 30, w2, 22, 8);
        g.fill();
        g.fillStyle = "#ffe9a8";
        g.fillText(castMsg, W / 2, H - 19);
      }
    }

    function drawEntities(arr) {
      arr.forEach((e) => {
        g.save();
        g.translate(e.x, e.y);
        if (e.dir === 1) g.scale(-1, 1); // emoji cá mặc định nhìn trái
        if (hooked && hooked.id === e.id) {
          const s = 1 + Math.sin(performance.now() / 60) * 0.08;
          g.scale(s, s);
        }
        g.font = (e.def.r * 1.7) + "px 'Segoe UI Emoji', sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(e.def.emoji, 0, 0);
        g.restore();
        if (e.kind === "item") {
          g.fillStyle = "rgba(255,209,102,0.85)";
          g.beginPath();
          g.arc(e.x, e.y - e.def.r - 2, 2.5, 0, Math.PI * 2);
          g.fill();
        }
      });
    }

    function roundRect(gc, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      gc.beginPath();
      gc.moveTo(x + rr, y);
      gc.arcTo(x + w, y, x + w, y + h, rr);
      gc.arcTo(x + w, y + h, x, y + h, rr);
      gc.arcTo(x, y + h, x, y, rr);
      gc.arcTo(x, y, x + w, y, rr);
      gc.closePath();
    }

    function renderTop() {
      const meSelf = ctx.isOnline ? (ctx.mySeat === 0 ? 0 : 1) : 0;
      top.innerHTML = `
        <div class="fh-score me">
          <span>🎣 Bạn</span>
          <b>${myScore} đ</b>
          <small>🐟 ${myCount} con</small>
        </div>
        <div class="fh-timer ${timeLeft <= 10 ? "low" : ""}">
          <b>${Math.max(0, Math.ceil(timeLeft))}</b>
          <small>giây</small>
        </div>
        <div class="fh-score opp">
          <span>👤 Đối thủ</span>
          <b>${oppScore} đ</b>
          <small>🐟 ${oppCount} con</small>
        </div>
      `;
    }

    function renderReel() {
      if (!hooked) { reel.classList.add("fh-hidden"); return; }
      reel.classList.remove("fh-hidden");
      const w = hooked.kind === "item" ? 1 : hooked.def.weight;
      const stars = "🏋️".repeat(w);
      const pct = Math.max(0, Math.min(100, progress));
      const col = pct > 66 ? "#6ee7b7" : pct > 33 ? "#ffd166" : "#ff5d73";
      reel.innerHTML = `
        <div class="fh-reel-head">${hooked.def.emoji} ${hooked.def.name} <span class="fh-reel-w">${stars || "nhẹ"}</span> — BẤM ${REEL_KEY_LABEL}!</div>
        <div class="fh-reel-bar"><i style="width:${pct}%;background:${col}"></i></div>
      `;
    }

    function renderBoosts() {
      const tags = [];
      if (baitNext) tags.push("🪱 mồi xịn");
      if (starNext) tags.push("⭐ x2");
      if (magnetNext) tags.push("🧲 nam châm");
      boosts.innerHTML = tags.length ? tags.map((t) => `<span>${t}</span>`).join("") : "";
    }

    // ====================== ĐỒNG HỒ / KẾT THÚC ======================
    function startCountdown() {
      if (phase !== "connect" && ctx.isOnline) return;
      phase = "countdown";
      countdown = 3;
      ctx.setStatus("Chuẩn bị...");
      renderTop();
      if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
      cdInt = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) { clearInterval(cdInt); cdInt = null; startPlay(); }
      }, 800);
    }

    function startPlay() {
      phase = "play";
      timeLeft = DURATION;
      ctx.setStatus("Câu nhanh nào! Nhắm chuột + bấm " + REEL_KEY_LABEL + " liên tục.");
      renderTop();
      timerInt = setInterval(() => {
        timeLeft -= 1;
        renderTop();
        if (timeLeft <= 0) endRace();
      }, 1000);
    }

    function endRace() {
      if (timerInt) { clearInterval(timerInt); timerInt = null; }
      if (phase === "over") return;
      phase = "over";
      if (hooked) { hooked = null; reel.classList.add("fh-hidden"); }
      myDone = true;
      if (ctx.isOnline) ctx.sendMove({ kind: "final", score: myScore, count: myCount });
      ctx.setStatus("Hết giờ! Đang tổng kết...");
      tryDecide();
      if (ctx.isOnline) setTimeout(() => { if (!decided) decide(); }, 3000);
    }

    function tryDecide() {
      if (decided) return;
      if (!ctx.isOnline) return decide();
      if (myDone && oppDone) decide();
    }

    function decide() {
      if (decided) return;
      decided = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      draw();
      if (!ctx.isOnline) { ctx.setStatus(`🏁 Luyện tập xong — ${myScore} điểm (${myCount} con).`); return; }
      let winner;
      if (myScore === oppScore) winner = -1;
      else if (myScore > oppScore) winner = ctx.mySeat;
      else winner = 1 - ctx.mySeat;
      if (winner === -1) { ctx.setStatus(`🤝 Hòa! Cả hai cùng ${myScore} điểm.`); return; }
      ctx.incScore(winner);
      ctx.setStatus(winner === ctx.mySeat
        ? `🎉 Bạn thắng! ${myScore} điểm so với ${oppScore}.`
        : `💀 Bạn thua. ${myScore} điểm, đối thủ ${oppScore}.`);
    }

    function relayScore() {
      if (ctx.isOnline) ctx.sendMove({ kind: "score", score: myScore, count: myCount });
    }

    // ====================== ONLINE ======================
    function applyMove(move, fromRemote) {
      if (!fromRemote || !move) return;
      if (move.kind === "ready") {
        oppReady = true;
        if (iReady && phase === "connect") startCountdown();
        return;
      }
      if (move.kind === "score") {
        oppScore = Number(move.score) || 0;
        oppCount = Number(move.count) || 0;
        renderTop();
        return;
      }
      if (move.kind === "final") {
        oppDone = true;
        oppScore = Number(move.score) || 0;
        oppCount = Number(move.count) || 0;
        renderTop();
        tryDecide();
        return;
      }
    }

    function teardown() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (timerInt) { clearInterval(timerInt); timerInt = null; }
      if (cdInt) { clearInterval(cdInt); cdInt = null; }
      document.removeEventListener("keydown", onKey);
    }

    // ----- khởi tạo -----
    renderTop();
    renderBoosts();
    draw();
    if (ctx.isOnline) {
      ctx.setNames(`🎣 Bạn${ctx.mySeat === 0 ? "" : ""}`, "👤 Đối thủ");
      ctx.setTurn(-1);
      iReady = true;
      ctx.sendMove({ kind: "ready" });
      if (oppReady) startCountdown();
      else ctx.setStatus("Đang chờ đối thủ vào hồ câu...");
    } else {
      ctx.setStatus("Chế độ luyện tập 1 người. Bấm cá để móc, bấm " + REEL_KEY_LABEL + " để kéo.");
      startCountdown();
    }
    return { applyMove, destroy: teardown };
  }

  window.GameRegistry.register({
    id: "fishingfrenzy",
    name: "Câu Cá Đối Đầu",
    emoji: "🎣",
    description: "Đua câu cá trong thời gian giới hạn: nhắm chuột vào cá rồi bấm phím Cách liên tục để kéo lên. Cá càng nặng càng khó, có vật phẩm hỗ trợ. Ai nhiều điểm hơn thắng.",
    onlineReady: true,
    localReady: true,
    options: [
      {
        id: "duration",
        label: "Thời gian",
        default: 60,
        choices: [
          { value: 45, label: "45 giây" },
          { value: 60, label: "1 phút" },
          { value: 90, label: "90 giây" },
        ],
      },
    ],
    howTo: [
      "Mỗi người câu trên hồ riêng của mình; cùng đua trong thời gian định sẵn.",
      "Nhắm bằng chuột: bấm vào con cá đang bơi để móc câu (bấm trúng gần con cá là được).",
      "Sau khi móc, BẤM PHÍM CÁCH liên tục để kéo cá lên. Thanh kéo sẽ tụt dần — cá càng nặng tụt càng nhanh, phải bấm nhanh hơn.",
      "Nếu thanh kéo về 0 hoặc quá lâu thì cá sổng mất. Kéo đầy thanh là bắt được.",
      "Có vật phẩm trôi nổi, phải câu lên mới nhận: 🪱 mồi xịn (con cá kế dễ kéo), ⭐ sao (x2 điểm con kế), 🧲 nam châm (con cá kế tự dính), 💎 ngọc (+6 điểm), 🥾 giày rách (chẳng được gì).",
      "Cá lớn/hiếm cho nhiều điểm hơn. Hết giờ, ai nhiều điểm hơn sẽ thắng.",
    ],
    create,
  });
})();
