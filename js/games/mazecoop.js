/* Mê Cung Hợp Sức (Co-op Maze) — chơi chung máy & ONLINE
   Hai người CÙNG PHE tìm đường tới cửa thoát của mình (🟥 cho P1, 🟦 cho P2).
   Phải phối hợp: có NÚT SÀN giữ cửa mở khi đứng lên, và CẦN GẠT bật/tắt cổng.
   Cả hai cùng tới cửa thoát của mình = qua màn. Giải hết các màn = cả đội THẮNG.

   Di chuyển tự do (không theo lượt). Chung máy: P1 = W/A/S/D, P2 = mũi tên
   (hoặc D-pad). Online: bạn chỉ điều khiển nhân vật của mình.

   Ký hiệu: '#'=tường, ' '=sàn, '1'/'2'=người, 'x'=thoát P1, 'y'=thoát P2,
   a/b/c=nút sàn (giữ) -> cửa A/B/C mở khi đang đè; p/q/r=cần gạt -> cổng P/Q/R
   bật/tắt mỗi lần bước lên. */
(function () {
  const LEVELS = [
    {
      name: "Mở lối cho nhau", nameEn: "Open the way",
      rows: [
        "########",
        "#1  P x#",
        "##### ##",
        "#2 p  y#",
        "########",
      ],
    },
    {
      name: "Giữ cửa & gạt cần", nameEn: "Hold & switch",
      rows: [
        "##########",
        "#1 A   px#",
        "#### #####",
        "#a 2 P  y#",
        "##########",
      ],
    },
    {
      name: "Phối hợp kép", nameEn: "Double coordination",
      rows: [
        "###########",
        "#1  A  p  x#",
        "##### #####",
        "#a   2   q#",
        "##### #####",
        "#Q  b   y#",
        "###########",
      ],
    },
  ];

  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  function create(ctx) {
    const online = ctx.isOnline;
    const mySeat = online ? ctx.mySeat : -1;
    let li = 0;
    let W = 0, H = 0;
    let walls, plates, holdDoors, levers, gates, exits;
    let players;
    let gateOpen;          // Map nhóm cần gạt -> bool
    let steps = 0;
    let over = false;

    const root = document.createElement("div");
    root.className = "mz-root";
    ctx.boardEl.appendChild(root);
    const hud = document.createElement("div");
    hud.className = "mz-hud";
    root.appendChild(hud);
    const stage = document.createElement("div");
    stage.className = "mz-stage";
    root.appendChild(stage);
    const pads = document.createElement("div");
    pads.className = "mz-pads";
    root.appendChild(pads);

    const idx = (r, c) => r * W + c;
    const rc = (i) => [Math.floor(i / W), i % W];

    function loadLevel(n) {
      const lv = LEVELS[n];
      W = Math.max(...lv.rows.map((s) => s.length));
      H = lv.rows.length;
      walls = new Set(); plates = new Map(); holdDoors = new Map(); levers = new Map(); gates = new Map(); exits = {};
      gateOpen = {};
      players = [-1, -1];
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        const ch = lv.rows[r][c] || "#"; const i = idx(r, c);
        if (ch === "#") walls.add(i);
        else if (ch === "1") players[0] = i;
        else if (ch === "2") players[1] = i;
        else if (ch === "x") exits.p1 = i;
        else if (ch === "y") exits.p2 = i;
        else if (ch >= "a" && ch <= "c") plates.set(i, ch);
        else if (ch >= "A" && ch <= "C") holdDoors.set(i, ch.toLowerCase());
        else if (ch >= "p" && ch <= "r") levers.set(i, ch);
        else if (ch >= "P" && ch <= "R") { gates.set(i, ch.toLowerCase()); gateOpen[ch.toLowerCase()] = false; }
      }
      steps = 0;
    }

    function activeHold() {
      const need = {}, have = {};
      plates.forEach((g, cell) => { need[g] = (need[g] || 0) + 1; if (players[0] === cell || players[1] === cell) have[g] = (have[g] || 0) + 1; });
      const a = new Set(); Object.keys(need).forEach((g) => { if ((have[g] || 0) >= need[g]) a.add(g); }); return a;
    }

    function cellOpen(cell, active) {
      if (holdDoors.has(cell)) return active.has(holdDoors.get(cell));
      if (gates.has(cell)) return !!gateOpen[gates.get(cell)];
      return true;
    }

    function tryMove(seat, dir, fromRemote) {
      if (over) return false;
      if (online && !fromRemote && seat !== mySeat) return false;
      const d = DIRS[dir]; if (!d) return false;
      const [r, c] = rc(players[seat]);
      const nr = r + d[0], nc = c + d[1];
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) return false;
      const ncell = idx(nr, nc);
      if (walls.has(ncell)) return false;
      const active = activeHold();
      if ((holdDoors.has(ncell) || gates.has(ncell)) && !cellOpen(ncell, active)) return false;
      if (players[1 - seat] === ncell) return false; // không chồng người
      players[seat] = ncell;
      // bước lên cần gạt -> đảo trạng thái cổng nhóm đó
      if (levers.has(ncell)) {
        const g = levers.get(ncell);
        gateOpen[g] = !gateOpen[g];
        ctx.sound("place");
      } else {
        ctx.sound("select");
      }
      steps++;
      if (!fromRemote && online) ctx.sendMove({ k: "move", seat: mySeat, dir });
      afterMove();
      return true;
    }

    function afterMove() {
      if (isSolved()) {
        if (li >= LEVELS.length - 1) finishAll();
        else { ctx.sound("win"); li++; loadLevel(li); }
      }
      render(); updateStatus();
    }

    function isSolved() {
      return players[0] === exits.p1 && players[1] === exits.p2;
    }

    function finishAll() {
      over = true;
      ctx.setTurn(-1);
      ctx.incScore(0);
      ctx.sound("win");
      ctx.setStatus(ctx.t(`🎉 Cả đội thoát hết ${LEVELS.length} mê cung!`, `🎉 The team escaped all ${LEVELS.length} mazes!`));
    }

    function restart(fromRemote) {
      if (!fromRemote && online) ctx.sendMove({ k: "restart" });
      loadLevel(li);
      over = false;
      render(); updateStatus();
    }

    function applyMove(move, fromRemote) {
      if (!move) return;
      if (move.k === "move") { tryMove(Number(move.seat), move.dir, !!fromRemote); return; }
      if (move.k === "restart") { restart(true); return; }
    }

    // ---------- Giao diện ----------
    const COLORS = ["#ff5d73", "#4dd0e1"];
    function render() {
      const lv = LEVELS[li];
      const atP1 = players[0] === exits.p1, atP2 = players[1] === exits.p2;
      hud.innerHTML =
        `<div class="mz-info"><b>${ctx.t("Mê cung", "Maze")} ${li + 1}/${LEVELS.length}</b> · <span>${ctx.t(lv.name, lv.nameEn)}</span></div>` +
        `<div class="mz-info">🟥 ${atP1 ? "✓" : "…"} · 🟦 ${atP2 ? "✓" : "…"} · 👣 ${steps}` +
        (online ? ` · <span style="color:${COLORS[mySeat] || "#fff"}">${ctx.t("bạn là P", "you are P")}${mySeat + 1}</span>` : "") + `</div>` +
        `<button type="button" class="btn small mz-restart">↺ ${ctx.t("Làm lại", "Restart")}</button>`;
      hud.querySelector(".mz-restart").addEventListener("click", () => restart(false));

      const active = activeHold();
      stage.style.setProperty("--mz-w", W);
      stage.style.setProperty("--mz-h", H);
      let html = "";
      for (let i = 0; i < W * H; i++) {
        if (walls.has(i)) { html += `<div class="mz-cell mz-wall"></div>`; continue; }
        let cls = "mz-cell mz-floor"; let inner = "";
        if (exits.p1 === i) { cls += " mz-exit mz-exit1"; inner += `<span class="mz-ex">🚪</span>`; }
        if (exits.p2 === i) { cls += " mz-exit mz-exit2"; inner += `<span class="mz-ex">🚪</span>`; }
        if (plates.has(i)) cls += " mz-plate mz-grp-" + plates.get(i);
        if (holdDoors.has(i)) cls += " mz-door mz-grp-" + holdDoors.get(i) + (cellOpen(i, active) ? " mz-open" : " mz-closed");
        if (levers.has(i)) { cls += " mz-lever mz-grp-" + levers.get(i); inner += `<span class="mz-lv">🎚️</span>`; }
        if (gates.has(i)) cls += " mz-gate mz-grp-" + gates.get(i) + (cellOpen(i, active) ? " mz-open" : " mz-closed");
        if (players[0] === i) inner += `<span class="mz-p mz-p1">🟥</span>`;
        if (players[1] === i) inner += `<span class="mz-p mz-p2">🟦</span>`;
        html += `<div class="${cls}">${inner}</div>`;
      }
      stage.innerHTML = html;
      renderPads();
    }

    function dpad(seat, enabled) {
      const dis = enabled ? "" : "disabled";
      return `<div class="mz-dpad" style="--mz-pc:${COLORS[seat]}">` +
        `<div class="mz-dpad-lbl">P${seat + 1}${online && seat === mySeat ? ctx.t(" (bạn)", " (you)") : ""}</div>` +
        `<div class="mz-dpad-grid">` +
          `<button type="button" class="mz-db" data-seat="${seat}" data-dir="up" ${dis}>▲</button>` +
          `<button type="button" class="mz-db" data-seat="${seat}" data-dir="left" ${dis}>◀</button>` +
          `<button type="button" class="mz-db" data-seat="${seat}" data-dir="down" ${dis}>▼</button>` +
          `<button type="button" class="mz-db" data-seat="${seat}" data-dir="right" ${dis}>▶</button>` +
        `</div></div>`;
    }
    function renderPads() {
      pads.innerHTML = online ? dpad(mySeat, !over) : dpad(0, !over) + dpad(1, !over);
      pads.querySelectorAll(".mz-db").forEach((b) => {
        b.addEventListener("click", () => tryMove(Number(b.dataset.seat), b.dataset.dir, false));
      });
    }

    function updateStatus() {
      if (over) return;
      ctx.setStatus(online
        ? ctx.t("Đưa cả hai nhân vật tới cửa thoát của mình. Dùng nút sàn & cần gạt để mở lối cho nhau.",
          "Get both characters to their exits. Use plates & levers to open the way for each other.")
        : ctx.t("P1: W/A/S/D · P2: mũi tên. Cả hai cùng tới cửa thoát. Đứng nút sàn / gạt cần để mở cổng.",
          "P1: W/A/S/D · P2: arrows. Both reach the exits. Stand on plates / flip levers to open gates."));
    }

    function onKey(e) {
      if (over) return;
      const k = e.key.toLowerCase();
      const m0 = { w: "up", a: "left", s: "down", d: "right" };
      const ma = { arrowup: "up", arrowleft: "left", arrowdown: "down", arrowright: "right" };
      if (online) { const dir = m0[k] || ma[k]; if (dir) { e.preventDefault(); tryMove(mySeat, dir, false); } return; }
      if (m0[k]) { e.preventDefault(); tryMove(0, m0[k], false); }
      else if (ma[k]) { e.preventDefault(); tryMove(1, ma[k], false); }
    }
    window.addEventListener("keydown", onKey);
    const cleanup = () => window.removeEventListener("keydown", onKey);
    const observer = new MutationObserver(() => { if (!document.body.contains(root)) { cleanup(); observer.disconnect(); } });
    observer.observe(ctx.boardEl.parentNode || document.body, { childList: true, subtree: true });

    if (online) ctx.setNames(ctx.t("P1", "P1") + (mySeat === 0 ? ctx.t(" (bạn)", " (you)") : ""), ctx.t("P2", "P2") + (mySeat === 1 ? ctx.t(" (bạn)", " (you)") : ""));
    else ctx.setNames(ctx.t("Người chơi 1", "Player 1"), ctx.t("Người chơi 2", "Player 2"));
    ctx.setTurn(-1);
    loadLevel(0);
    render();
    updateStatus();

    function destroy() { cleanup(); observer.disconnect(); }
    return { applyMove, destroy };
  }

  window.GameRegistry.register({
    id: "mazecoop",
    name: "Mê Cung Hợp Sức",
    emoji: "🗝️",
    description: "Co-op mê cung: hai người mở lối cho nhau bằng nút sàn & cần gạt để cùng tới cửa thoát. Chơi chung máy hoặc online.",
    onlineReady: true,
    supportsAI: false,
    coop: true,
    howTo: [
      "Game CO-OP: hai người cùng phe. Mục tiêu là đưa CẢ HAI nhân vật tới đúng cửa thoát của mình (🟥 P1, 🟦 P2) để qua màn.",
      "Mỗi người điều khiển một nhân vật. Chung máy: P1 dùng W/A/S/D, P2 dùng phím mũi tên (hoặc D-pad). Online: bạn chỉ điều khiển nhân vật mình.",
      "NÚT SÀN (ô sáng màu): cửa cùng màu MỞ khi đang có người đứng lên — một người giữ nút để người kia đi qua.",
      "CẦN GẠT 🎚️: bước lên để BẬT/TẮT cổng cùng màu (giữ trạng thái sau đó). Thường một người gạt mở cổng cho người kia.",
      "Cổng đóng và cửa chưa mở thì không đi qua được. Phối hợp thứ tự đi để mở đúng lối.",
      "Cả hai cùng đứng trên cửa thoát của mình là qua màn. Giải hết các mê cung là cả đội thắng. Bí thì bấm '↺ Làm lại'.",
    ],
    create,
  });
})();
