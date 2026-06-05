/* Pig (Heo Cờ) — xúc xắc, chơi chung máy & ONLINE
   Đến lượt: GIEO xúc xắc nhiều lần để cộng dồn điểm tạm.
   - Ra 1: mất hết điểm tạm, chuyển lượt.
   - GIỮ: cộng điểm tạm vào điểm tổng, chuyển lượt.
   Ai đạt mốc điểm trước sẽ thắng.
   Nước đi: { kind:"roll", die } | { kind:"hold" }. Người gieo tự tung,
   gửi kết quả cho đối thủ (đồng bộ). */
(function () {
  function create(ctx) {
    const o = ctx.options || {};
    const TARGET = o.target || 100;

    let totals = [0, 0];
    let temp = 0;        // điểm tạm của lượt hiện tại
    let turn = 0;
    let over = false;
    let lastDie = 0;
    let rolling = false;
    let rollTimer = null;

    const root = document.createElement("div");
    root.className = "pig-root";
    root.innerHTML =
      `<div class="pig-scores">` +
      `<div class="pig-p p1"><span>Người chơi 1</span><b id="pigT0">0</b></div>` +
      `<div class="pig-p p2"><span>Người chơi 2</span><b id="pigT1">0</b></div>` +
      `</div>` +
      `<div class="pig-die-stage"><div class="pig-cube" id="pigCube"></div></div>` +
      `<div class="pig-temp">Điểm tạm lượt này: <b id="pigTemp">0</b></div>` +
      `<div class="pig-actions">` +
      `<button class="btn primary" id="pigRoll">🎲 Gieo</button>` +
      `<button class="btn" id="pigHold">✋ Giữ điểm</button>` +
      `</div>`;
    ctx.boardEl.appendChild(root);

    const cube = root.querySelector("#pigCube");
    const tempEl = root.querySelector("#pigTemp");
    const rollBtn = root.querySelector("#pigRoll");
    const holdBtn = root.querySelector("#pigHold");
    const tEls = [root.querySelector("#pigT0"), root.querySelector("#pigT1")];

    // bố cục chấm trên lưới 3x3
    const PIP_LAYOUT = {
      1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
    };
    // 6 mặt khối lập phương: front=1, back=6, right=2, left=5, top=3, bottom=4
    const FACES = [
      { cls: "front", val: 1 }, { cls: "back", val: 6 },
      { cls: "right", val: 2 }, { cls: "left", val: 5 },
      { cls: "top", val: 3 }, { cls: "bottom", val: 4 },
    ];
    // góc xoay để mặt có giá trị v hướng ra trước (front)
    const FACE_ROT = {
      1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0],
    };
    FACES.forEach((f) => {
      const face = document.createElement("div");
      face.className = "pig-cube-face " + f.cls;
      const set = new Set(PIP_LAYOUT[f.val] || []);
      for (let k = 0; k < 9; k++) {
        const slot = document.createElement("span");
        slot.className = "pig-pip-slot" + (set.has(k) ? " on" : "");
        face.appendChild(slot);
      }
      cube.appendChild(face);
    });

    // đặt khối hiển thị mặt `value` hướng ra trước, kèm số vòng quay thêm.
    // thêm nghiêng nhẹ (-18°, 18°) khi đứng yên để luôn thấy khối 3D.
    function setCubeFace(value, spins) {
      const [rx, ry] = FACE_ROT[value] || [0, 0];
      const ex = (spins || 0) * 360;
      const tiltX = spins ? 0 : -18;
      const tiltY = spins ? 0 : 18;
      cube.style.transform = `rotateX(${rx + ex + tiltX}deg) rotateY(${ry + ex + tiltY}deg)`;
    }
    setCubeFace(1, 0);

    function myTurn() { return !ctx.isOnline || turn === ctx.mySeat; }

    function updateButtons() {
      const active = myTurn() && !over && !rolling;
      rollBtn.disabled = !active;
      holdBtn.disabled = !active || temp === 0;
    }

    rollBtn.addEventListener("click", () => {
      if (!myTurn() || over || rolling) return;
      const die = 1 + Math.floor(Math.random() * 6);
      applyMove({ kind: "roll", die }, false);
    });
    holdBtn.addEventListener("click", () => {
      if (!myTurn() || over || rolling || temp === 0) return;
      applyMove({ kind: "hold" }, false);
    });

    function applyMove(move, fromRemote) {
      if (over) return;

      if (move.kind === "roll") {
        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
        lastDie = move.die;
        // hoạt ảnh: khối lập phương lăn nhiều vòng rồi dừng ở mặt kết quả
        rolling = true;
        updateButtons();
        ctx.sound("shot");
        cube.classList.add("tumbling");
        // quay tới mặt kết quả + thêm vài vòng cho tự nhiên
        const spins = 2 + Math.floor(Math.random() * 2);
        setCubeFace(move.die, spins);
        clearTimeout(rollTimer);
        rollTimer = setTimeout(() => {
          cube.classList.remove("tumbling");
          // chuẩn hoá lại transform về đúng mặt (bỏ vòng quay thừa) để lần sau mượt
          setCubeFace(move.die, 0);
          cube.classList.add("landed");
          setTimeout(() => cube.classList.remove("landed"), 320);
          rolling = false;
          resolveRoll(move.die);
        }, 900);
        return;
      }

      if (move.kind === "hold") {
        if (!fromRemote && ctx.isOnline) ctx.sendMove(move);
        totals[turn] += temp;
        tEls[turn].textContent = totals[turn];
        ctx.sound("capture");
        if (totals[turn] >= TARGET) return finish(turn);
        nextTurn(`✋ Người chơi ${turn + 1} giữ ${temp} điểm.`);
      }
    }

    function resolveRoll(die) {
      if (die === 1) {
        cube.classList.add("bust");
        setTimeout(() => cube.classList.remove("bust"), 700);
        const opp = 1 - turn;
        const moved = temp;
        if (moved > 0) {
          totals[opp] += moved;
          tEls[opp].textContent = totals[opp];
        }
        temp = 0;
        tempEl.textContent = 0;
        ctx.sound("error");
        // điểm chuyển sang có thể giúp đối thủ thắng luôn
        if (totals[opp] >= TARGET) return finish(opp);
        nextTurn(moved > 0
          ? `💥 Người chơi ${turn + 1} ra 1 — chuyển ${moved} điểm tạm cho đối thủ!`
          : `💥 Người chơi ${turn + 1} ra 1!`);
      } else {
        temp += die;
        tempEl.textContent = temp;
        ctx.sound("select");
        ctx.setStatus(`Người chơi ${turn + 1} gieo ra ${die}. Tổng tạm: ${temp}. Gieo tiếp hay giữ?`);
        updateButtons();
      }
    }

    function nextTurn(msg) {
      temp = 0;
      tempEl.textContent = 0;
      turn = 1 - turn;
      ctx.setTurn(turn);
      ctx.setStatus(`${msg} — Lượt Người chơi ${turn + 1}.`);
      updateButtons();
    }

    function finish(winner) {
      over = true;
      ctx.setTurn(-1);
      ctx.incScore(winner);
      ctx.setStatus(`🎉 Người chơi ${winner + 1} đạt ${totals[winner]} điểm — chiến thắng!`);
      updateButtons();
    }

    ctx.setTurn(0);
    ctx.setStatus(`Gieo xúc xắc để cộng điểm. Đạt ${TARGET} điểm trước sẽ thắng. Ra 1 là CHUYỂN điểm tạm cho đối thủ!`);
    updateButtons();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "pig",
    name: "Pig (Heo Cờ Xúc Xắc)",
    emoji: "🎲",
    description: "Gieo xúc xắc cộng dồn điểm, nhưng ra 1 là CHUYỂN hết điểm tạm cho đối thủ. Biết dừng đúng lúc để thắng.",
    onlineReady: true,
    options: [
      {
        id: "target", label: "Điểm để thắng", default: 150,
        choices: [
          { value: 100, label: "100 (nhanh)" },
          { value: 150, label: "150 (chuẩn)" },
          { value: 200, label: "200 (lâu)" },
          { value: 300, label: "300 (marathon)" },
        ],
      },
    ],
    howTo: [
      "Đến lượt mình, bấm 🎲 Gieo để tung xúc xắc. Mỗi lần gieo cộng số nút vào 'điểm tạm' của lượt.",
      "Bạn có thể gieo nhiều lần liên tiếp để cộng dồn — nhưng càng tham càng rủi ro.",
      "Nếu gieo ra số 1: toàn bộ điểm tạm của lượt bị CHUYỂN SANG cho đối thủ, rồi tới lượt họ. (Luật mới — gắt hơn!)",
      "Bấm ✋ Giữ điểm để cộng điểm tạm vào điểm tổng của mình và kết thúc lượt an toàn.",
      "Ai đạt mốc điểm (mặc định 150) trước sẽ thắng. Cẩn thận: điểm tạm bị 'cướp' có thể giúp đối thủ thắng luôn!",
    ],
    create,
  });
})();
