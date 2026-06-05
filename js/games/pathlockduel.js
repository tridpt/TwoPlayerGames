/* Me Cung Ghep Duong - puzzle doi khang dat tile, xoay tile va khoa o */
(function () {
  const N = 7;
  const MID = Math.floor(N / 2);
  const DIRS = [
    { r: -1, c: 0, bit: 1, opp: 4 },
    { r: 0, c: 1, bit: 2, opp: 8 },
    { r: 1, c: 0, bit: 4, opp: 1 },
    { r: 0, c: -1, bit: 8, opp: 2 },
  ];
  const SHAPES = {
    straight: { label: "Thẳng", base: 1 | 4 },
    corner: { label: "Góc", base: 1 | 2 },
    tee: { label: "Ngã ba", base: 1 | 2 | 4 },
  };
  const GLYPHS = {
    3: "└", 5: "│", 6: "┌", 9: "┘", 10: "─", 12: "┐",
    7: "├", 11: "┴", 13: "┤", 14: "┬", 15: "┼",
  };

  function create(ctx) {
    const cells = Array(N * N).fill(null);
    const locks = [3, 3];
    let selectedShape = "straight";
    let selectedRot = 1;
    let mode = "tile";
    let turn = 0;
    let over = false;

    const root = document.createElement("div");
    root.className = "pld-wrap";
    root.innerHTML = `
      <div class="pld-toolbar">
        <div class="pld-tools"></div>
        <button class="btn small pld-rotate" type="button">Xoay mẫu</button>
        <button class="btn small pld-lock" type="button">Khóa ô</button>
      </div>
      <div class="pld-locks"></div>
      <div class="pld-board"></div>
    `;
    ctx.boardEl.appendChild(root);

    const toolsEl = root.querySelector(".pld-tools");
    const rotateBtn = root.querySelector(".pld-rotate");
    const lockBtn = root.querySelector(".pld-lock");
    const locksEl = root.querySelector(".pld-locks");
    const board = root.querySelector(".pld-board");
    const buttons = {};
    const cellEls = [];

    Object.keys(SHAPES).forEach((shape) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn small pld-shape";
      btn.dataset.shape = shape;
      btn.addEventListener("click", () => {
        selectedShape = shape;
        mode = "tile";
        render();
      });
      toolsEl.appendChild(btn);
      buttons[shape] = btn;
    });

    rotateBtn.addEventListener("click", () => {
      selectedRot = (selectedRot + 1) % 4;
      mode = "tile";
      render();
    });
    lockBtn.addEventListener("click", () => {
      mode = mode === "lock" ? "tile" : "lock";
      render();
    });

    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "pld-cell";
      cell.addEventListener("click", () => onCell(i));
      board.appendChild(cell);
      cellEls.push(cell);
    }

    function idx(r, c) { return r * N + c; }
    function row(i) { return Math.floor(i / N); }
    function col(i) { return i % N; }
    function canAct() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function rotateBits(bits, rot) {
      let out = bits;
      for (let i = 0; i < rot; i++) {
        let next = 0;
        if (out & 1) next |= 2;
        if (out & 2) next |= 4;
        if (out & 4) next |= 8;
        if (out & 8) next |= 1;
        out = next;
      }
      return out;
    }

    function currentBits() {
      return rotateBits(SHAPES[selectedShape].base, selectedRot);
    }

    function glyph(bits) {
      return GLYPHS[bits] || "┼";
    }

    function onCell(i) {
      if (!canAct()) return;
      const current = cells[i];
      if (mode === "lock") {
        if (current || locks[turn] <= 0) return;
        applyMove({ t: "lock", i }, false);
        return;
      }
      if (current && current.type === "tile") {
        applyMove({ t: "rotate", i }, false);
        return;
      }
      if (!current) {
        applyMove({ t: "place", i, shape: selectedShape, rot: selectedRot }, false);
      }
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const i = Number(move?.i);
      if (!Number.isInteger(i) || i < 0 || i >= cells.length) return;

      if (move.t === "place") {
        const shape = SHAPES[move.shape] ? move.shape : "straight";
        const rot = Number(move.rot);
        if (cells[i] || !Number.isInteger(rot) || rot < 0 || rot > 3) return;
        cells[i] = { type: "tile", shape, rot, owner: turn };
        ctx.sound("place");
      } else if (move.t === "rotate") {
        if (!cells[i] || cells[i].type !== "tile") return;
        cells[i].rot = (cells[i].rot + 1) % 4;
        ctx.sound("rotate");
      } else if (move.t === "lock") {
        if (cells[i] || locks[turn] <= 0) return;
        cells[i] = { type: "lock", owner: turn };
        locks[turn]--;
        ctx.sound("capture");
      } else {
        return;
      }

      if (!fromRemote && ctx.isOnline) ctx.sendMove(move);

      const p0 = hasRoute(0);
      const p1 = hasRoute(1);
      if (p0 || p1) {
        const winner = p0 && p1 ? turn : p0 ? 0 : 1;
        over = true;
        ctx.incScore(winner);
        ctx.setTurn(-1);
        ctx.setStatus(`🎉 Người chơi ${winner + 1} nối được đường hoàn chỉnh!`);
        render();
        return;
      }

      turn = 1 - turn;
      ctx.setTurn(turn);
      updateStatus();
      render();
    }

    function tileBits(i) {
      const cell = cells[i];
      if (!cell || cell.type !== "tile") return 0;
      return rotateBits(SHAPES[cell.shape].base, cell.rot);
    }

    function hasRoute(player) {
      const queue = [];
      const seen = new Set();
      for (let i = 0; i < cells.length; i++) {
        const r = row(i);
        const c = col(i);
        const bits = tileBits(i);
        if (!bits) continue;
        if (player === 0 && c === 0 && (bits & 8)) {
          queue.push(i);
          seen.add(i);
        }
        if (player === 1 && r === 0 && (bits & 1)) {
          queue.push(i);
          seen.add(i);
        }
      }

      while (queue.length) {
        const cur = queue.shift();
        const r = row(cur);
        const c = col(cur);
        const bits = tileBits(cur);
        if (player === 0 && c === N - 1 && (bits & 2)) return true;
        if (player === 1 && r === N - 1 && (bits & 4)) return true;

        DIRS.forEach((dir) => {
          if (!(bits & dir.bit)) return;
          const nr = r + dir.r;
          const nc = c + dir.c;
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
          const ni = idx(nr, nc);
          if (seen.has(ni)) return;
          const nb = tileBits(ni);
          if (!(nb & dir.opp)) return;
          seen.add(ni);
          queue.push(ni);
        });
      }
      return false;
    }

    function updateStatus() {
      if (over) return;
      const goal = turn === 0 ? "nối trái sang phải" : "nối trên xuống dưới";
      ctx.setStatus(`Người chơi ${turn + 1}: đặt tile, xoay tile có sẵn hoặc khóa ô để ${goal}.`);
    }

    function render() {
      const sample = glyph(currentBits());
      Object.entries(buttons).forEach(([shape, btn]) => {
        btn.classList.toggle("active", mode === "tile" && shape === selectedShape);
        btn.textContent = `${SHAPES[shape].label} ${shape === selectedShape ? sample : glyph(SHAPES[shape].base)}`;
      });
      rotateBtn.textContent = `Xoay mẫu ${sample}`;
      lockBtn.textContent = `Khóa ô (${locks[turn]})`;
      lockBtn.classList.toggle("active", mode === "lock");
      lockBtn.disabled = !canAct() || locks[turn] <= 0;
      locksEl.textContent = `Khóa còn lại: Người chơi 1 = ${locks[0]}, Người chơi 2 = ${locks[1]}`;

      cellEls.forEach((el, i) => {
        const cell = cells[i];
        el.className = "pld-cell";
        el.textContent = "";
        el.disabled = !canAct();
        if (!cell) {
          if (canAct()) el.classList.add(mode === "lock" ? "lockable" : "placeable");
          return;
        }
        if (cell.type === "lock") {
          el.classList.add("locked", `p${cell.owner + 1}`);
          el.textContent = "×";
          el.disabled = true;
          return;
        }
        const bits = tileBits(i);
        el.classList.add("tile", `p${cell.owner + 1}`);
        el.textContent = glyph(bits);
        el.disabled = !canAct();
      });
    }

    ctx.setNames("Người chơi 1 (trái-phải)", "Người chơi 2 (trên-dưới)");
    ctx.setTurn(0);
    updateStatus();
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "pathlockduel",
    name: "Mê Cung Ghép Đường",
    emoji: "🧩",
    description: "Đặt tile đường, xoay tile và khóa ô để nối tuyến của mình trước khi đối thủ phá.",
    onlineReady: true,
    howTo: [
      "Người chơi 1 cố nối một đường từ cạnh trái sang cạnh phải.",
      "Người chơi 2 cố nối một đường từ cạnh trên xuống cạnh dưới.",
      "Đến lượt, bạn có thể đặt một tile đường vào ô trống, xoay một tile đã có, hoặc dùng khóa để chặn một ô trống.",
      "Mỗi người chỉ có 3 khóa trong một ván, nên dùng để cắt đường đối thủ hoặc bảo vệ tuyến của mình.",
      "Đường chỉ nối khi hai tile kề nhau có đầu mở chạm nhau. Ai hoàn thành tuyến trước sẽ thắng.",
    ],
    create,
  });
})();
