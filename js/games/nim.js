/* Nim - Bốc Sỏi — chơi chung máy & online
   Nhiều hàng sỏi. Đến lượt, bốc bao nhiêu viên tùy ý nhưng chỉ từ MỘT hàng.
   Ai bốc viên cuối cùng sẽ THẮNG. */
(function () {
  const PRESETS = {
    classic: [3, 5, 7],
    small: [1, 3, 5],
    big: [3, 5, 7, 9],
    huge: [1, 3, 5, 7, 9],
  };

  function create(ctx) {
    const preset = (ctx.options && ctx.options.preset) || "classic";
    const INIT = PRESETS[preset] || PRESETS.classic;
    let rows = INIT.slice();
    let turn = 0;
    let selRow = null;       // hàng đang chọn
    let selCount = 0;        // số viên đang chọn để bốc
    let over = false;

    const wrap = document.createElement("div");
    wrap.className = "nim-board";
    ctx.boardEl.appendChild(wrap);

    const rowEls = [];
    INIT.forEach((_, r) => {
      const rowEl = document.createElement("div");
      rowEl.className = "nim-row";
      wrap.appendChild(rowEl);
      rowEls.push(rowEl);
    });

    const actions = document.createElement("div");
    actions.className = "nim-actions";
    const takeBtn = document.createElement("button");
    takeBtn.className = "btn primary";
    takeBtn.textContent = "Bốc";
    takeBtn.disabled = true;
    takeBtn.addEventListener("click", confirmTake);
    actions.appendChild(takeBtn);
    ctx.boardEl.appendChild(actions);

    function canPlay() { return !over && (!ctx.isOnline || turn === ctx.mySeat); }

    function render() {
      rows.forEach((n, r) => {
        const rowEl = rowEls[r];
        rowEl.innerHTML = "";
        const label = document.createElement("span");
        label.className = "nim-label";
        label.textContent = `Hàng ${r + 1}`;
        rowEl.appendChild(label);
        for (let i = 0; i < n; i++) {
          const stone = document.createElement("div");
          stone.className = "nim-stone";
          // các viên ngoài cùng bên phải được chọn để bốc
          const willTake = selRow === r && i >= n - selCount;
          if (willTake) stone.classList.add("taking");
          if (selRow === r && canPlay()) {
            const cnt = n - i; // bấm viên này = bốc cnt viên (từ i đến hết)
            stone.addEventListener("click", () => selectCount(r, cnt));
          } else if (canPlay()) {
            stone.addEventListener("click", () => selectCount(r, n - i));
          }
          rowEl.appendChild(stone);
        }
      });
      takeBtn.disabled = !(canPlay() && selRow !== null && selCount > 0);
    }

    function selectCount(r, count) {
      if (!canPlay()) return;
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
      const { row, count } = move;
      if (row < 0 || row >= rows.length || count <= 0 || count > rows[row]) return;

      rows[row] -= count;
      ctx.sound("capture");
      if (!fromRemote && ctx.isOnline) ctx.sendMove({ row, count });

      selRow = null;
      selCount = 0;

      if (rows.every((n) => n === 0)) {
        over = true;
        ctx.incScore(turn);
        ctx.setStatus(`🎉 Người chơi ${turn + 1} bốc viên cuối — chiến thắng!`);
        ctx.setTurn(-1);
        render();
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
      ctx.setStatus(`Lượt Người chơi ${turn + 1} — chọn số viên muốn bốc từ một hàng.`);
      render();
    }

    ctx.setTurn(0);
    ctx.setStatus("Chọn số viên muốn bốc từ MỘT hàng, rồi bấm \"Bốc\". Ai bốc viên cuối sẽ thắng.");
    render();
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "nim",
    name: "Bốc Sỏi (Nim)",
    emoji: "🪨",
    description: "Cờ trí tuệ kinh điển: bốc sỏi từ các hàng, ai bốc viên cuối cùng sẽ thắng.",
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
    ],
    howTo: [
      "Có 3 hàng sỏi (3, 5 và 7 viên).",
      "Đến lượt mình, bạn phải bốc ít nhất 1 viên, và chỉ được bốc từ MỘT hàng duy nhất (bốc bao nhiêu tùy ý).",
      "Bấm vào một viên sỏi để chọn bốc từ viên đó đến hết hàng, rồi bấm nút \"Bốc\" để xác nhận.",
      "Hai người luân phiên bốc. Ai bốc được viên sỏi CUỐI CÙNG trên bàn sẽ thắng.",
      "Mẹo: đây là game có chiến thuật tối ưu — hãy thử tìm ra quy luật thắng!",
    ],
    create,
  });
})();
