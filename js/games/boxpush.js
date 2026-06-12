/* Đẩy Thùng Đôi (Co-op Sokoban) — chơi chung máy & ONLINE
   Hai người CÙNG PHE giải đố: đẩy mọi thùng 📦 vào ô đích 🎯. Có nút sàn (plate)
   giữ cửa mở — một người đứng/đặt thùng lên nút để mở cửa cho người kia đi/đẩy qua.
   Giải xong tất cả màn = cả đội THẮNG.

   Di chuyển TỰ DO (không theo lượt): mỗi người điều khiển nhân vật của mình.
   Chung máy: P1 dùng W/A/S/D, P2 dùng phím mũi tên (hoặc bấm D-pad trên màn).
   Online: bạn chỉ điều khiển nhân vật của mình; mỗi nước đi relay sang đối thủ.

   Ký hiệu màn: '#'=tường, ' '=sàn, '1'/'2'=người chơi, '$'=thùng, 'g'=đích,
   '*'=thùng sẵn trên đích, chữ thường a/b/c=nút sàn (nhóm), chữ HOA A/B/C=cửa.
   Cửa nhóm X mở khi MỌI nút nhóm X đang bị đè (bởi người hoặc thùng). */
(function () {
  const LEVELS = [
    {
      name: "Khởi động", nameEn: "Warm-up",
      rows: [
        "#######",
        "#1 $ g#",
        "#######",
        "#g $ 2#",
        "#######",
      ],
    },
    {
      name: "Mở cửa giúp nhau", nameEn: "Open the door",
      rows: [
        "#########",
        "#1 $ A g#",
        "#########",
        "#a   2  #",
        "#########",
      ],
    },
    {
      name: "Giữ cửa, đẩy đôi", nameEn: "Hold & double push",
      rows: [
        "############",
        "#1 $  $ A gg#",
        "#          #",
        "#a    2    #",
        "############",
      ],
    },
  ];

  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  function create(ctx) {
    const online = ctx.isOnline;
    const mySeat = online ? ctx.mySeat : -1;
    let li = 0;             // chỉ số màn
    let W = 0, H = 0;
    let walls, goals, plates, doors; // Set / Map theo cell index
    let boxes;              // Set cell
    let players;            // [cell0, cell1]
    let moves = 0;
    let over = false;
    let solvedAll = false;

    const root = document.createElement("div");
    root.className = "bx-root";
    ctx.boardEl.appendChild(root);
    const hud = document.createElement("div");
    hud.className = "bx-hud";
    root.appendChild(hud);
    const stage = document.createElement("div");
    stage.className = "bx-stage";
    root.appendChild(stage);
    const pads = document.createElement("div");
    pads.className = "bx-pads";
    root.appendChild(pads);

    function idx(r, c) { return r * W + c; }
    function rc(i) { return [Math.floor(i / W), i % W]; }

    function loadLevel(n) {
      const lv = LEVELS[n];
      W = Math.max(...lv.rows.map((s) => s.length));
      H = lv.rows.length;
      walls = new Set(); goals = new Set(); plates = new Map(); doors = new Map(); boxes = new Set();
      players = [-1, -1];
      for (let r = 0; r < H; r++) {
        const row = lv.rows[r];
        for (let c = 0; c < W; c++) {
          const ch = row[c] || "#"; // pad ô thiếu bằng tường
          const i = idx(r, c);
          if (ch === "#") { walls.add(i); continue; }
          if (ch === "1") players[0] = i;
          else if (ch === "2") players[1] = i;
          else if (ch === "$") boxes.add(i);
          else if (ch === "g") goals.add(i);
          else if (ch === "*") { boxes.add(i); goals.add(i); }
          else if (ch >= "a" && ch <= "c") plates.set(i, ch);
          else if (ch >= "A" && ch <= "C") doors.set(i, ch.toLowerCase());
        }
      }
      moves = 0;
    }

    // nhóm cửa X mở khi MỌI nút nhóm X đang bị đè (người hoặc thùng)
    function activeGroups() {
      const need = {}; const have = {};
      plates.forEach((g, cell) => {
        need[g] = (need[g] || 0) + 1;
        const pressed = boxes.has(cell) || players[0] === cell || players[1] === cell;
        if (pressed) have[g] = (have[g] || 0) + 1;
      });
      const active = new Set();
      Object.keys(need).forEach((g) => { if ((have[g] || 0) >= need[g]) active.add(g); });
      return active;
    }

    function doorOpen(cell, active) {
      const g = doors.get(cell);
      return g ? active.has(g) : true;
    }

    function passable(cell, active, ignorePlayers) {
      if (cell < 0) return false;
      if (walls.has(cell)) return false;
      if (doors.has(cell) && !doorOpen(cell, active)) return false;
      if (!ignorePlayers && (players[0] === cell || players[1] === cell)) return false;
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
      const active = activeGroups();
      if (walls.has(ncell)) return false;
      if (doors.has(ncell) && !doorOpen(ncell, active)) return false;
      if (players[1 - seat] === ncell) return false; // không đẩy người
      if (boxes.has(ncell)) {
        const br = nr + d[0], bc = nc + d[1];
        if (br < 0 || br >= H || bc < 0 || bc >= W) return false;
        const bcell = idx(br, bc);
        // ô sau thùng phải trống (sàn/đích/nút/cửa mở) và không có thùng/người
        if (walls.has(bcell) || boxes.has(bcell)) return false;
        if (doors.has(bcell) && !doorOpen(bcell, active)) return false;
        if (players[0] === bcell || players[1] === bcell) return false;
        boxes.delete(ncell); boxes.add(bcell);
        players[seat] = ncell;
        ctx.sound("place");
      } else {
        players[seat] = ncell;
        ctx.sound("select");
      }
      moves++;
      if (!fromRemote && online) ctx.sendMove({ k: "move", seat: mySeat, dir });
      afterMove();
      return true;
    }

    function afterMove() {
      if (isSolved()) {
        if (li >= LEVELS.length - 1) {
          finishAll();
        } else {
          // qua màn — cả hai client tự tính nên đồng bộ
          ctx.sound("win");
          li++;
          loadLevel(li);
        }
      }
      render();
      updateStatus();
    }

    function isSolved() {
      for (const g of goals) if (!boxes.has(g)) return false;
      return true;
    }

    function finishAll() {
      over = true; solvedAll = true;
      ctx.setTurn(-1);
      ctx.incScore(0);
      ctx.sound("win");
      ctx.setStatus(ctx.t(`🎉 Cả đội giải xong tất cả ${LEVELS.length} màn!`, `🎉 The team solved all ${LEVELS.length} levels!`));
    }

    function restart(fromRemote) {
      if (!fromRemote && online) ctx.sendMove({ k: "restart" });
      loadLevel(li);
      over = false; solvedAll = false;
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
      const done = [...goals].filter((g) => boxes.has(g)).length;
      hud.innerHTML =
        `<div class="bx-info"><b>${ctx.t("Màn", "Level")} ${li + 1}/${LEVELS.length}</b> · <span>${ctx.t(lv.name, lv.nameEn)}</span></div>` +
        `<div class="bx-info">📦 ${done}/${goals.size} · 👣 ${moves}` +
        (online ? ` · <span class="bx-me" style="color:${COLORS[mySeat] || "#fff"}">${ctx.t("bạn là P", "you are P")}${mySeat + 1}</span>` : "") + `</div>` +
        `<button type="button" class="btn small bx-restart">↺ ${ctx.t("Làm lại màn", "Restart level")}</button>`;
      hud.querySelector(".bx-restart").addEventListener("click", () => restart(false));

      const active = activeGroups();
      stage.style.setProperty("--bx-w", W);
      stage.style.setProperty("--bx-h", H);
      let html = "";
      for (let i = 0; i < W * H; i++) {
        if (walls.has(i)) { html += `<div class="bx-cell bx-wall"></div>`; continue; }
        let cls = "bx-cell bx-floor";
        let inner = "";
        if (goals.has(i)) cls += " bx-goal";
        if (plates.has(i)) { cls += " bx-plate bx-grp-" + plates.get(i); }
        if (doors.has(i)) { cls += " bx-door bx-grp-" + doors.get(i) + (doorOpen(i, active) ? " bx-open" : " bx-closed"); }
        if (boxes.has(i)) inner += `<span class="bx-box${goals.has(i) ? " bx-box-on" : ""}">📦</span>`;
        if (players[0] === i) inner += `<span class="bx-p bx-p1">🧑</span>`;
        if (players[1] === i) inner += `<span class="bx-p bx-p2">🧑</span>`;
        html += `<div class="bx-cell ${cls}">${inner}</div>`;
      }
      stage.innerHTML = html;

      renderPads();
    }

    function dpad(seat, enabled) {
      const dis = enabled ? "" : "disabled";
      const c = COLORS[seat];
      return `<div class="bx-dpad bx-dpad-${seat}" style="--bx-pc:${c}">` +
        `<div class="bx-dpad-lbl">P${seat + 1}${online && seat === mySeat ? ctx.t(" (bạn)", " (you)") : ""}</div>` +
        `<div class="bx-dpad-grid">` +
          `<button type="button" class="bx-db" data-seat="${seat}" data-dir="up" ${dis}>▲</button>` +
          `<button type="button" class="bx-db" data-seat="${seat}" data-dir="left" ${dis}>◀</button>` +
          `<button type="button" class="bx-db" data-seat="${seat}" data-dir="down" ${dis}>▼</button>` +
          `<button type="button" class="bx-db" data-seat="${seat}" data-dir="right" ${dis}>▶</button>` +
        `</div></div>`;
    }

    function renderPads() {
      if (online) {
        pads.innerHTML = dpad(mySeat, !over);
      } else {
        pads.innerHTML = dpad(0, !over) + dpad(1, !over);
      }
      pads.querySelectorAll(".bx-db").forEach((b) => {
        b.addEventListener("click", () => tryMove(Number(b.dataset.seat), b.dataset.dir, false));
      });
    }

    function updateStatus() {
      if (over) return;
      if (online) {
        ctx.setStatus(ctx.t("Cùng phối hợp đẩy mọi thùng 📦 vào đích 🎯. Bạn điều khiển nhân vật của mình.",
          "Work together to push every box 📦 onto a target 🎯. You control your own character."));
      } else {
        ctx.setStatus(ctx.t("P1: W/A/S/D · P2: phím mũi tên. Đẩy mọi thùng vào đích. Đứng lên nút sàn để mở cửa.",
          "P1: W/A/S/D · P2: arrow keys. Push every box onto a target. Stand on plates to open doors."));
      }
    }

    function onKey(e) {
      if (over) return;
      const k = e.key.toLowerCase();
      const map0 = { w: "up", a: "left", s: "down", d: "right" };
      const mapArr = { arrowup: "up", arrowleft: "left", arrowdown: "down", arrowright: "right" };
      if (online) {
        const dir = map0[k] || mapArr[k];
        if (dir) { e.preventDefault(); tryMove(mySeat, dir, false); }
        return;
      }
      if (map0[k]) { e.preventDefault(); tryMove(0, map0[k], false); }
      else if (mapArr[k]) { e.preventDefault(); tryMove(1, mapArr[k], false); }
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
    id: "boxpush",
    name: "Đẩy Thùng Đôi",
    emoji: "📦",
    description: "Co-op giải đố: hai người cùng đẩy mọi thùng vào đích. Có nút sàn giữ cửa — phải phối hợp mới qua. Chơi chung máy hoặc online.",
    onlineReady: true,
    supportsAI: false,
    coop: true,
    howTo: [
      "Đây là game CO-OP: hai người cùng một phe, mục tiêu là đẩy MỌI thùng 📦 vào ô đích 🎯 để qua màn.",
      "Mỗi người điều khiển một nhân vật. Chung máy: P1 dùng W/A/S/D, P2 dùng phím mũi tên (hoặc bấm D-pad trên màn). Online: bạn chỉ điều khiển nhân vật của mình.",
      "Đi vào thùng để đẩy nó (chỉ đẩy được nếu ô phía sau trống). Không đẩy được hai thùng liền nhau hay đẩy vào tường/cửa đóng.",
      "Nút sàn (ô sáng màu) mở cửa cùng màu khi ĐANG bị đè — bởi người đứng lên hoặc bởi một thùng. Một người có thể đứng giữ nút để người kia đẩy thùng qua cửa.",
      "Giải xong tất cả các màn là cả đội thắng. Bí quá thì bấm '↺ Làm lại màn' để xếp lại.",
    ],
    create,
  });
})();
