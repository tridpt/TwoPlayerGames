/* Nim - Bốc Sỏi — chơi chung máy & online
   Nhiều hàng sỏi. Đến lượt, bốc bao nhiêu viên tùy ý (có thể giới hạn) nhưng chỉ từ MỘT hàng.
   Chế độ thường: ai bốc viên CUỐI thắng. Chế độ ngược (misère): ai bốc viên cuối THUA. */
(function () {
  const PRESETS = {
    classic: [3, 5, 7],
    small: [1, 3, 5],
    big: [3, 5, 7, 9],
    huge: [1, 3, 5, 7, 9],
  };
  const STONE_COLORS = ["#8be6f0", "#ffd166", "#a7f3d0", "#f7a8c8", "#c792ea", "#ff9f7a", "#9bd86d"];

  function create(ctx) {
    const o = ctx.options || {};
    const preset = o.preset || "classic";
    const INIT = PRESETS[preset] || PRESETS.classic;
    const misere = o.mode === "misere";
    const LIMIT = o.limit ? Number(o.limit) : 0; // 0 = không giới hạn

    let rows = INIT.slice();
    let turn = 0;
    let selRow = null;
    let selCount = 0;
    let over = false;

    const root = document.createElement("div");
    root.className = "nim-root";
    ctx.boardEl.appendChild(root);

    const header = document.createElement("div");
    header.className = "nim-header";
    root.appendChild(header);

    const wrap = document.createElement("div");
    wrap.className = "nim-board";
    root.appendChild(wrap);

    const rowEls = [];
    INIT.forEach(() => {
      const rowEl = document.createElement("div");
      rowEl.className = "nim-row";
      rowEl.innerHTML = `<span class="nim-label"></span><div class="nim-tray"></div><span class="nim-count"></span>`;
      wrap.appendChild(rowEl);
      rowEls.push(rowEl);
    });

    const actions = document.createElement("div");
    actions.className = "nim-actions";
    actions.innerHTML = `
      <button class="btn nim-clear" type="button">Bỏ chọn</button>
      <button class="btn primary nim-take" type="button" disabled>Bốc</button>
    `;
    root.appendChild(actions);
    const takeBtn = actions.querySelector(".nim-take");
    const clearBtn = actions.querySelector(".nim-clear");
    takeBtn.addEventListener("click", confirmTake);
    clearBtn.addEventListener("click", () => { if (canPlay()) { selRow = null; selCount = 0; render(); updateStatus(); } });

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }
    function maxTake(r) { return LIMIT > 0 ? Math.min(LIMIT, rows[r]) : rows[r]; }
    function totalStones() { return rows.reduce((a, b) => a + b, 0); }

    function render() {
      const me = ctx.isOnline ? ctx.mySeat : -1;
      header.innerHTML = `
        <div class="nim-turn ${over ? "" : "p" + (turn + 1)}">
          ${over ? "Kết thúc" : `Lượt: Người chơi ${turn + 1}${me === turn ? " (bạn)" : ""}`}
        </div>
        <div class="nim-rule">
          ${misere ? "🔁 Ngược: bốc viên CUỐI sẽ THUA" : "🏆 Thường: bốc viên CUỐI sẽ THẮNG"}
          ${LIMIT > 0 ? ` · tối đa ${LIMIT}/lượt` : ""}
        </div>
      `;

      rows.forEach((n, r) => {
        const rowEl = rowEls[r];
        rowEl.querySelector(".nim-label").textContent = `Hàng ${r + 1}`;
        rowEl.querySelector(".nim-count").textContent = n;
        const tray = rowEl.querySelector(".nim-tray");
        tray.innerHTML = "";
        rowEl.classList.toggle("empty", n === 0);
        const limit = maxTake(r);
        for (let i = 0; i < n; i++) {
          const stone = document.createElement("div");
          stone.className = "nim-stone";
          // biến thể nhẹ theo chỉ số (tất định, không nhảy mỗi render)
          const v = (r * 7 + i * 3) % STONE_COLORS.length;
          const size = 26 + ((r + i) % 3) * 4;
          stone.style.setProperty("--sc", STONE_COLORS[v]);
          stone.style.width = size + "px";
          stone.style.height = size + "px";
          stone.style.transform = `rotate(${((i * 37) % 40) - 20}deg)`;
          const cnt = n - i; // bốc từ viên này tới hết hàng
          const takeable = cnt <= limit;
          if (selRow === r && i >= n - selCount) stone.classList.add("taking");
          if (canPlay() && takeable) {
            stone.classList.add("pickable");
            stone.addEventListener("click", () => selectCount(r, cnt));
          } else if (canPlay() && !takeable) {
            stone.classList.add("locked");
          }
          tray.appendChild(stone);
        }
      });
      takeBtn.disabled = !(canPlay() && selRow !== null && selCount > 0);
      clearBtn.disabled = !(canPlay() && selRow !== null);
    }

    function selectCount(r, count) {
      if (!canPlay()) return;
      const limit = maxTake(r);
      count = Math.max(1, Math.min(count, limit));
      selRow = r;
      selCount = count;
      render();
      ctx.setStatus(`Đang chọn: bốc ${count} viên ở Hàng ${r + 1}. Bấm "Bốc" để xác nhận.`);
    }

    function confirmTake() {
      if (!canPlay() || selRow === null || selCount <= 0) return;
      applyMove({ row: selRow, count: selCount }, false);
    }

    function applyMove(move, fromRemote) {
      if (over) return;
      const row = Number(move.row);
      const count = Number(move.count);
      if (row < 0 || row >= rows.length || count <= 0 || count > rows[row]) return;
      if (LIMIT > 0 && count > LIMIT) return;

      rows[row] -= count;
      ctx.sound("capture");
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ row, count });

      selRow = null;
      selCount = 0;

      if (totalStones() === 0) {
        over = true;
        // thường: người vừa bốc (turn) thắng; ngược: người vừa bốc thua
        const winner = misere ? 1 - turn : turn;
        ctx.incScore(winner);
        ctx.setTurn(-1);
        const reason = misere
          ? `Người chơi ${turn + 1} buộc phải bốc viên cuối`
          : `Người chơi ${turn + 1} bốc viên cuối`;
        ctx.setStatus(`🎉 Người chơi ${winner + 1} thắng — ${reason}!`);
        render();
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
      render();
      updateStatus();
    }

    function updateStatus() {
      if (over) return;
      if (ctx.isOnline && turn !== ctx.mySeat) {
        ctx.setStatus(`Đối thủ đang bốc... (${totalStones()} viên còn lại)`);
      } else {
        const tip = misere ? "Tránh phải bốc viên cuối!" : "Cố bốc được viên cuối!";
        ctx.setStatus(`Người chơi ${turn + 1}: chọn số viên bốc từ MỘT hàng rồi bấm "Bốc". ${tip}`);
      }
    }

    ctx.setTurn(0);
    render();
    updateStatus();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "nim",
    name: "Bốc Sỏi (Nim)",
    emoji: "🪨",
    description: "Cờ trí tuệ kinh điển: bốc sỏi từ các hàng. Chọn luật thường (bốc viên cuối thắng) hay luật ngược (bốc viên cuối thua), thêm giới hạn mỗi lượt để biến hóa.",
    onlineReady: true,
    options: [
      {
        id: "preset", label: "Cấu hình hàng sỏi", default: "classic",
        choices: [
          { value: "small", label: "1·3·5 (nhỏ)" },
          { value: "classic", label: "3·5·7 (chuẩn)" },
          { value: "big", label: "3·5·7·9 (4 hàng)" },
          { value: "huge", label: "1·3·5·7·9 (5 hàng)" },
        ],
      },
      {
        id: "mode", label: "Luật thắng", default: "normal",
        choices: [
          { value: "normal", label: "Bốc viên cuối THẮNG" },
          { value: "misere", label: "Bốc viên cuối THUA (ngược)" },
        ],
      },
      {
        id: "limit", label: "Giới hạn mỗi lượt", default: 0,
        choices: [
          { value: 0, label: "Không giới hạn" },
          { value: 3, label: "Tối đa 3 viên" },
          { value: 4, label: "Tối đa 4 viên" },
        ],
      },
    ],
    howTo: [
      "Có nhiều hàng sỏi. Đến lượt mình, bạn phải bốc ít nhất 1 viên và chỉ được bốc từ MỘT hàng duy nhất.",
      "Bấm vào một viên để chọn bốc từ viên đó đến hết hàng (các viên sẽ sáng lên), rồi bấm \"Bốc\". Bấm \"Bỏ chọn\" nếu muốn chọn lại.",
      "Luật THƯỜNG: ai bốc viên sỏi CUỐI CÙNG sẽ THẮNG. Luật NGƯỢC (misère): ai buộc phải bốc viên cuối sẽ THUA — chiến thuật đảo ngược, hồi hộp hơn.",
      "Có thể bật GIỚI HẠN mỗi lượt (tối đa 3 hoặc 4 viên) để thành biến thể trừ, đòi tính toán khác hẳn.",
      "Mẹo: cả hai chế độ đều có chiến thuật tối ưu — hãy thử tìm ra quy luật để luôn thắng!",
    ],
    create,
  });
})();
