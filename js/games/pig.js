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

    const root = document.createElement("div");
    root.className = "pig-root";
    root.innerHTML =
      `<div class="pig-scores">` +
      `<div class="pig-p p1"><span>Người chơi 1</span><b id="pigT0">0</b></div>` +
      `<div class="pig-p p2"><span>Người chơi 2</span><b id="pigT1">0</b></div>` +
      `</div>` +
      `<div class="pig-die" id="pigDie">🎲</div>` +
      `<div class="pig-temp">Điểm tạm lượt này: <b id="pigTemp">0</b></div>` +
      `<div class="pig-actions">` +
      `<button class="btn primary" id="pigRoll">🎲 Gieo</button>` +
      `<button class="btn" id="pigHold">✋ Giữ điểm</button>` +
      `</div>`;
    ctx.boardEl.appendChild(root);

    const dieEl = root.querySelector("#pigDie");
    const tempEl = root.querySelector("#pigTemp");
    const rollBtn = root.querySelector("#pigRoll");
    const holdBtn = root.querySelector("#pigHold");
    const tEls = [root.querySelector("#pigT0"), root.querySelector("#pigT1")];
    const DICE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

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
        // hoạt ảnh lăn ngắn
        rolling = true;
        updateButtons();
        let ticks = 0;
        const anim = setInterval(() => {
          dieEl.textContent = DICE[1 + Math.floor(Math.random() * 6)];
          if (++ticks >= 6) {
            clearInterval(anim);
            dieEl.textContent = DICE[move.die];
            rolling = false;
            resolveRoll(move.die);
          }
        }, 60);
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
