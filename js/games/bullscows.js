/* Đoán Số (Bulls & Cows) — chơi chung máy & ONLINE
   Mỗi người đặt một dãy số bí mật. Thay nhau đoán dãy của đối thủ.
   Phản hồi: 🎯 (đúng số đúng chỗ) và 🐮 (đúng số sai chỗ).
   Bí mật KHÔNG gửi qua mạng — chỉ gửi { kind:"ready" }, { kind:"guess", digits },
   { kind:"result", digits, bulls, cows, win }. */
(function () {
  function create(ctx) {
    const o = ctx.options || {};
    const LEN = o.len || 4;          // độ dài dãy số
    const UNIQUE = o.unique !== false; // mặc định: các chữ số khác nhau

    let phase = "set";   // set | play | over
    let mySecret = null;
    let iReady = false, oppReady = false;
    let turn = 0;        // seat được đoán
    let awaiting = false;

    const root = document.createElement("div");
    root.className = "bc-root";
    ctx.boardEl.appendChild(root);

    // ----- giai đoạn đặt số bí mật -----
    const setBox = document.createElement("div");
    setBox.className = "bc-setbox";
    setBox.innerHTML =
      `<h3>Đặt dãy số bí mật của bạn (${LEN} chữ số${UNIQUE ? ", không trùng nhau" : ""})</h3>` +
      `<input class="bc-input" id="bcSecret" maxlength="${LEN}" inputmode="numeric" placeholder="${"•".repeat(LEN)}">` +
      `<button class="btn primary" id="bcSetBtn">✓ Khóa dãy số</button>` +
      `<p class="bc-err" id="bcSetErr"></p>`;
    root.appendChild(setBox);

    // ----- khu chơi -----
    const playBox = document.createElement("div");
    playBox.className = "bc-playbox hidden";
    playBox.innerHTML =
      `<div class="bc-guessrow">` +
      `<input class="bc-input" id="bcGuess" maxlength="${LEN}" inputmode="numeric" placeholder="${"•".repeat(LEN)}">` +
      `<button class="btn primary" id="bcGuessBtn">Đoán</button></div>` +
      `<p class="bc-err" id="bcGuessErr"></p>` +
      `<div class="bc-cols">` +
      `<div class="bc-col"><h4>Bạn đoán</h4><div class="bc-log" id="bcMine"></div></div>` +
      `<div class="bc-col"><h4>Đối thủ đoán</h4><div class="bc-log" id="bcOpp"></div></div>` +
      `</div>`;
    root.appendChild(playBox);

    const secretInput = setBox.querySelector("#bcSecret");
    const setBtn = setBox.querySelector("#bcSetBtn");
    const setErr = setBox.querySelector("#bcSetErr");
    const guessInput = playBox.querySelector("#bcGuess");
    const guessBtn = playBox.querySelector("#bcGuessBtn");
    const guessErr = playBox.querySelector("#bcGuessErr");
    const mineLog = playBox.querySelector("#bcMine");
    const oppLog = playBox.querySelector("#bcOpp");

    [secretInput, guessInput].forEach((inp) =>
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, LEN); }));

    function validCode(s) {
      if (s.length !== LEN) return "Phải đủ " + LEN + " chữ số.";
      if (UNIQUE && new Set(s).size !== LEN) return "Các chữ số phải khác nhau.";
      return null;
    }

    setBtn.addEventListener("click", () => {
      const s = secretInput.value;
      const err = validCode(s);
      if (err) { setErr.textContent = err; return; }
      mySecret = s;
      iReady = true;
      setBox.innerHTML = `<h3>✓ Đã khóa dãy số: <b>${"•".repeat(LEN)}</b></h3>` +
        `<p class="bc-wait" id="bcWait">Đang chờ đối thủ...</p>`;
      if (ctx.isOnline) ctx.sendMove({ kind: "ready" });
      maybeStart();
    });

    function maybeStart() {
      // chung máy: chỉ cần người này đặt xong sẽ tới người kia đặt — nhưng để đơn giản,
      // chung máy ta cho cả hai đặt trên cùng máy lần lượt:
      if (!ctx.isOnline) {
        // hot-seat: đặt số cho người 2 ngay sau người 1
        if (!secrets[0]) { secrets[0] = mySecret; promptLocalSecret(1); return; }
        if (!secrets[1]) { secrets[1] = mySecret; beginPlay(); return; }
      } else {
        if (iReady && oppReady) beginPlay();
      }
    }

    // hot-seat: lưu 2 bí mật
    const secrets = [null, null];
    function promptLocalSecret(seat) {
      iReady = false;
      mySecret = null;
      setBox.innerHTML =
        `<h3>Người chơi ${seat + 1}: đặt dãy số bí mật (${LEN} chữ số${UNIQUE ? ", không trùng" : ""})</h3>` +
        `<input class="bc-input" id="bcSecret2" maxlength="${LEN}" inputmode="numeric" placeholder="${"•".repeat(LEN)}">` +
        `<button class="btn primary" id="bcSetBtn2">✓ Khóa dãy số</button>` +
        `<p class="bc-err" id="bcSetErr2"></p>`;
      const inp = setBox.querySelector("#bcSecret2");
      const btn = setBox.querySelector("#bcSetBtn2");
      const err = setBox.querySelector("#bcSetErr2");
      inp.addEventListener("input", () => { inp.value = inp.value.replace(/\D/g, "").slice(0, LEN); });
      btn.addEventListener("click", () => {
        const e = validCode(inp.value);
        if (e) { err.textContent = e; return; }
        secrets[seat] = inp.value;
        beginPlay();
      });
    }

    function beginPlay() {
      phase = "play";
      setBox.classList.add("hidden");
      playBox.classList.remove("hidden");
      turn = 0;
      ctx.setTurn(0);
      updateInput();
      ctx.setStatus(`Lượt Người chơi 1 đoán dãy của đối thủ.`);
    }

    // tính bulls & cows giữa guess và secret
    function evaluate(guess, secret) {
      let bulls = 0, cows = 0;
      for (let i = 0; i < LEN; i++) {
        if (guess[i] === secret[i]) bulls++;
        else if (secret.includes(guess[i])) cows++;
      }
      return { bulls, cows };
    }

    function updateInput() {
      const mine = !ctx.isOnline || turn === ctx.mySeat;
      guessInput.disabled = !mine || awaiting;
      guessBtn.disabled = !mine || awaiting;
    }

    guessBtn.addEventListener("click", () => {
      if (phase !== "play") return;
      const mine = !ctx.isOnline || turn === ctx.mySeat;
      if (!mine || awaiting) return;
      const gErr = validCode(guessInput.value);
      if (gErr) { guessErr.textContent = gErr; return; }
      guessErr.textContent = "";
      const digits = guessInput.value;
      guessInput.value = "";

      if (ctx.isOnline) {
        awaiting = true;
        updateInput();
        ctx.sendMove({ kind: "guess", digits });
        ctx.setStatus("Đã đoán, chờ kết quả...");
      } else {
        // hot-seat: đối chiếu với secret của đối thủ ngay
        const secret = secrets[1 - turn];
        const { bulls, cows } = evaluate(digits, secret);
        logGuess(turn === 0 ? mineLog : oppLog, digits, bulls, cows);
        if (bulls === LEN) return endGame(turn);
        turn = 1 - turn;
        ctx.setTurn(turn);
        updateInput();
        ctx.setStatus(`Lượt Người chơi ${turn + 1} đoán.`);
      }
    });

    function logGuess(logEl, digits, bulls, cows) {
      const row = document.createElement("div");
      row.className = "bc-guess";
      row.innerHTML = `<span class="bc-digits">${digits}</span>` +
        `<span class="bc-fb">${"🎯".repeat(bulls)}${"🐮".repeat(cows)}` +
        `${bulls === 0 && cows === 0 ? "—" : ""}</span>`;
      logEl.appendChild(row);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function endGame(winnerSeat) {
      phase = "over";
      ctx.setTurn(-1);
      guessInput.disabled = true; guessBtn.disabled = true;
      ctx.incScore(winnerSeat);
      ctx.setStatus(`🎉 Người chơi ${winnerSeat + 1} đoán đúng — chiến thắng!`);
    }

    // ----- online message -----
    function applyMove(move, fromRemote) {
      if (!fromRemote) return;
      if (move.kind === "ready") {
        oppReady = true;
        maybeStart();
        return;
      }
      if (move.kind === "guess") {
        // đối thủ đoán dãy của TÔI -> tôi tính kết quả rồi gửi lại
        const { bulls, cows } = evaluate(move.digits, mySecret);
        const win = bulls === LEN;
        ctx.sendMove({ kind: "result", digits: move.digits, bulls, cows, win });
        logGuess(oppLog, move.digits, bulls, cows);
        if (win) { endGameOnline(1 - ctx.mySeat); return; }
        turn = ctx.mySeat;
        ctx.setTurn(turn);
        updateInput();
        ctx.setStatus("Lượt bạn đoán.");
        return;
      }
      if (move.kind === "result") {
        // kết quả cho phát đoán của TÔI
        awaiting = false;
        logGuess(mineLog, move.digits, move.bulls, move.cows);
        ctx.sound(move.bulls > 0 ? "capture" : "select");
        if (move.win) { endGameOnline(ctx.mySeat); return; }
        turn = 1 - ctx.mySeat;
        ctx.setTurn(turn);
        updateInput();
        ctx.setStatus("Lượt đối thủ đoán...");
        return;
      }
    }

    function endGameOnline(winnerSeat) {
      phase = "over";
      ctx.setTurn(-1);
      guessInput.disabled = true; guessBtn.disabled = true;
      if (winnerSeat === ctx.mySeat) { ctx.incScore(ctx.mySeat); ctx.setStatus("🎉 Bạn đoán đúng — chiến thắng!"); }
      else ctx.setStatus("💀 Đối thủ đã đoán ra dãy số của bạn. Bạn thua!");
    }

    // ----- khởi tạo -----
    if (!ctx.isOnline) {
      setBox.querySelector("h3").textContent =
        `Người chơi 1: đặt dãy số bí mật (${LEN} chữ số${UNIQUE ? ", không trùng" : ""})`;
    }
    ctx.setStatus("Đặt dãy số bí mật để bắt đầu.");
    return { applyMove };
  }

  window.GameRegistry.register({
    id: "bullscows",
    name: "Đoán Số (Bulls & Cows)",
    emoji: "🔢",
    description: "Đặt dãy số bí mật, thay nhau đoán dãy của đối thủ. Ai đoán đúng trước sẽ thắng.",
    onlineReady: true,
    options: [
      {
        id: "len", label: "Độ dài dãy", default: 4,
        choices: [
          { value: 3, label: "3 số (dễ)" },
          { value: 4, label: "4 số (chuẩn)" },
          { value: 5, label: "5 số (khó)" },
        ],
      },
      {
        id: "unique", label: "Chữ số", default: true,
        choices: [
          { value: true, label: "Không trùng nhau" },
          { value: false, label: "Cho phép trùng" },
        ],
      },
    ],
    howTo: [
      "Mỗi người đặt một dãy số bí mật (mặc định 4 chữ số khác nhau).",
      "Thay nhau đoán dãy số của đối thủ. Sau mỗi lần đoán, bạn nhận phản hồi:",
      "🎯 = một chữ số ĐÚNG và ĐÚNG vị trí. 🐮 = chữ số đúng nhưng SAI vị trí.",
      "Ví dụ secret 1234, đoán 1325 → 🎯 (số 1) và 🐮🐮 (số 3 và 2 sai chỗ).",
      "Dựa vào phản hồi để suy luận. Ai đoán ra đúng toàn bộ dãy của đối thủ trước sẽ thắng.",
    ],
    create,
  });
})();
