/* ============================================================
   Khung điều khiển chung: menu, chọn chế độ, sảnh online, vòng chơi
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    menu: $("menu"),
    gameGrid: $("gameGrid"),
    modeView: $("modeView"),
    modeTitle: $("modeTitle"),
    modeLocal: $("modeLocal"),
    modeOnline: $("modeOnline"),
    modeBackBtn: $("modeBackBtn"),
    lobbyView: $("lobbyView"),
    lobbyTitle: $("lobbyTitle"),
    lobbyBackBtn: $("lobbyBackBtn"),
    createRoomBtn: $("createRoomBtn"),
    roomCodeBox: $("roomCodeBox"),
    roomCodeVal: $("roomCodeVal"),
    copyCodeBtn: $("copyCodeBtn"),
    waitingMsg: $("waitingMsg"),
    joinCodeInput: $("joinCodeInput"),
    joinRoomBtn: $("joinRoomBtn"),
    lobbyError: $("lobbyError"),
    gameView: $("gameView"),
    gameTitle: $("gameTitle"),
    boardWrap: $("boardWrap"),
    status: $("status"),
    turnBanner: $("turnBanner"),
    onlineBadge: $("onlineBadge"),
    p1Name: $("p1Name"),
    p2Name: $("p2Name"),
    p1Score: $("p1Score"),
    p2Score: $("p2Score"),
    backBtn: $("backBtn"),
    restartBtn: $("restartBtn"),
    homeBtn: $("homeBtn"),
    helpBtn: $("helpBtn"),
    helpOverlay: $("helpOverlay"),
    helpTitle: $("helpTitle"),
    helpBody: $("helpBody"),
    helpClose: $("helpClose"),
    helpOk: $("helpOk"),
    chatPanel: $("chatPanel"),
    chatToggle: $("chatToggle"),
    chatBody: $("chatBody"),
    chatMessages: $("chatMessages"),
    chatForm: $("chatForm"),
    chatInput: $("chatInput"),
    chatQuick: $("chatQuick"),
  };

  // ---- Trạng thái phiên ----
  let selectedGame = null;
  let instance = null;
  let scores = [0, 0];
  let online = null; // null = chơi chung máy; {seat, seed} = online

  // ====================== Context cho game ======================
  function makeContext(seed) {
    return {
      boardEl: el.boardWrap,
      isOnline: !!online,
      mySeat: online ? online.seat : -1,
      rng: window.makeRng(seed || 1),
      setStatus(text) { el.status.textContent = text || ""; },
      setTurn(idx) {
        if (idx === -1) { el.turnBanner.textContent = "Kết thúc"; el.turnBanner.style.color = "var(--text)"; return; }
        const name = idx === 0 ? el.p1Name.textContent : el.p2Name.textContent;
        let label = "Lượt: " + name;
        if (online) label += idx === online.seat ? " (bạn)" : " (đối thủ)";
        el.turnBanner.textContent = label;
        el.turnBanner.style.color = idx === 0 ? "var(--p1)" : "var(--p2)";
      },
      setNames(n1, n2) { el.p1Name.textContent = n1; el.p2Name.textContent = n2; },
      incScore(idx) { scores[idx]++; renderScores(); },
      getScore(idx) { return scores[idx]; },
      sendMove(move) { if (online) Net.send("move", { move }); },
    };
  }

  function renderScores() {
    el.p1Score.textContent = scores[0];
    el.p2Score.textContent = scores[1];
  }

  // ====================== Menu chọn game ======================
  function renderMenu() {
    el.gameGrid.innerHTML = "";
    GameRegistry.games.forEach((g) => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.innerHTML =
        `<div class="emoji">${g.emoji}</div>` +
        `<h3>${g.name}</h3>` +
        `<p>${g.description}</p>` +
        (g.onlineReady === false ? `<span class="tag-local">chỉ chung máy</span>` : "");
      card.addEventListener("click", () => openMode(g));
      el.gameGrid.appendChild(card);
    });
  }

  // ====================== Chọn chế độ ======================
  function openMode(game) {
    selectedGame = game;
    el.modeTitle.textContent = game.emoji + " " + game.name;
    // game không hỗ trợ online thì ẩn lựa chọn online
    el.modeOnline.classList.toggle("disabled", game.onlineReady === false);
    // game chỉ chơi online (giấu thông tin) thì ẩn lựa chọn chung máy
    el.modeLocal.classList.toggle("disabled", game.localReady === false);
    show("modeView");
  }

  el.modeLocal.addEventListener("click", () => {
    if (selectedGame.localReady === false) return;
    online = null;
    startGame();
  });

  el.modeOnline.addEventListener("click", () => {
    if (selectedGame.onlineReady === false) return;
    openLobby();
  });

  // ====================== Sảnh online ======================
  function openLobby() {
    el.lobbyTitle.textContent = "🌐 " + selectedGame.name + " — Chơi online";
    el.roomCodeBox.classList.add("hidden");
    el.lobbyError.textContent = "";
    el.joinCodeInput.value = "";
    show("lobbyView");
  }

  async function ensureConnected() {
    try {
      await Net.connect();
      return true;
    } catch (e) {
      el.lobbyError.textContent = "⚠️ Không kết nối được server. Hãy chạy qua 'npm start' rồi mở http://localhost:8777";
      return false;
    }
  }

  el.createRoomBtn.addEventListener("click", async () => {
    el.lobbyError.textContent = "";
    if (!(await ensureConnected())) return;
    Net.send("create", { gameId: selectedGame.id });
  });

  el.joinRoomBtn.addEventListener("click", async () => {
    el.lobbyError.textContent = "";
    const code = el.joinCodeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
      el.lobbyError.textContent = "Mã phòng phải gồm 4 chữ số.";
      return;
    }
    if (!(await ensureConnected())) return;
    Net.send("join", { code });
  });

  el.copyCodeBtn.addEventListener("click", () => {
    navigator.clipboard?.writeText(el.roomCodeVal.textContent).then(() => {
      el.copyCodeBtn.textContent = "✓ Đã chép";
      setTimeout(() => (el.copyCodeBtn.textContent = "📋 Sao chép"), 1500);
    });
  });

  el.joinCodeInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
  });

  // ---- Sự kiện từ server ----
  Net.on("created", (m) => {
    el.roomCodeVal.textContent = m.code;
    el.roomCodeBox.classList.remove("hidden");
    el.waitingMsg.textContent = "Đang chờ người chơi thứ hai vào phòng...";
  });

  Net.on("error", (m) => { el.lobbyError.textContent = "⚠️ " + m.message; });

  Net.on("start", (m) => {
    online = { seat: m.seat, seed: m.seed };
    startGame(m.seed);
  });

  Net.on("move", (m) => {
    if (instance && instance.applyMove) instance.applyMove(m.move, true);
  });

  Net.on("restart", (m) => {
    online = { seat: m.seat, seed: m.seed };
    startGame(m.seed);
  });

  Net.on("opponent_left", () => {
    if (!online) return;
    el.status.textContent = "👋 Đối thủ đã rời phòng.";
    el.turnBanner.textContent = "Đối thủ thoát";
    addChatMessage("Đối thủ đã rời phòng.", "sys");
  });

  Net.on("disconnected", () => {
    if (online) el.status.textContent = "🔌 Mất kết nối tới server.";
  });

  Net.on("chat", (m) => addChatMessage(m.text, "them"));

  // ====================== Chat (chỉ online) ======================
  const QUICK_MSGS = ["Chào! 👋", "Nước hay! 👍", "Gắt thế 😅", "Ván nữa nhé!", "GG 🎉"];

  function buildQuickButtons() {
    el.chatQuick.innerHTML = "";
    QUICK_MSGS.forEach((text) => {
      const b = document.createElement("button");
      b.className = "chat-quick-btn";
      b.textContent = text;
      b.addEventListener("click", () => sendChat(text));
      el.chatQuick.appendChild(b);
    });
  }

  function addChatMessage(text, who) {
    const msg = document.createElement("div");
    msg.className = "chat-msg " + (who === "me" ? "me" : who === "them" ? "them" : "sys");
    if (who === "sys") {
      msg.textContent = text;
    } else {
      const label = document.createElement("span");
      label.className = "chat-msg-who";
      label.textContent = who === "me" ? "Bạn" : "Đối thủ";
      const body = document.createElement("span");
      body.className = "chat-msg-text";
      body.textContent = text;
      msg.appendChild(label);
      msg.appendChild(body);
    }
    el.chatMessages.appendChild(msg);
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  }

  function sendChat(text) {
    text = String(text || "").trim().slice(0, 200);
    if (!text || !online) return;
    Net.send("chat", { text });
    addChatMessage(text, "me");
  }

  el.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendChat(el.chatInput.value);
    el.chatInput.value = "";
  });

  el.chatToggle.addEventListener("click", () => {
    el.chatPanel.classList.toggle("collapsed");
    el.chatToggle.textContent = el.chatPanel.classList.contains("collapsed") ? "▸" : "▾";
  });

  // ====================== Vòng chơi ======================
  function startGame(seed) {
    el.boardWrap.innerHTML = "";
    el.status.textContent = "";
    scores = [0, 0];
    renderScores();
    el.gameTitle.textContent = selectedGame.emoji + " " + selectedGame.name;

    if (online) {
      el.onlineBadge.classList.remove("hidden");
      el.onlineBadge.textContent =
        `🌐 Online — bạn là Người chơi ${online.seat + 1}`;
      el.restartBtn.textContent = "↻ Ván mới";
      el.chatPanel.classList.remove("hidden", "collapsed");
      el.chatToggle.textContent = "▾";
      if (el.chatMessages.childElementCount === 0) buildQuickButtons();
    } else {
      el.onlineBadge.classList.add("hidden");
      el.restartBtn.textContent = "↻ Chơi lại";
      el.chatPanel.classList.add("hidden");
    }

    const ctx = makeContext(seed);
    ctx.setNames("Người chơi 1", "Người chơi 2");
    instance = selectedGame.create(ctx);
    show("gameView");
  }

  function restartGame() {
    if (!selectedGame) return;
    if (online) {
      // chủ phòng mới được khởi tạo lại; gửi yêu cầu, server phát seed mới
      Net.send("restart");
      el.status.textContent = "Đang bắt đầu ván mới...";
      return;
    }
    startGame();
  }

  function goHome() {
    if (online) { Net.send("leave"); online = null; }
    el.chatMessages.innerHTML = "";
    el.chatPanel.classList.add("hidden");
    selectedGame = null;
    instance = null;
    show("menu");
  }

  // ---- Điều hướng màn hình ----
  function show(viewId) {
    ["menu", "modeView", "lobbyView", "gameView"].forEach((id) => {
      el[id].classList.toggle("hidden", id !== viewId);
    });
  }

  el.backBtn.addEventListener("click", goHome);
  el.homeBtn.addEventListener("click", goHome);
  el.modeBackBtn.addEventListener("click", () => show("menu"));
  el.lobbyBackBtn.addEventListener("click", () => show("modeView"));
  el.restartBtn.addEventListener("click", restartGame);

  // ---- Modal hướng dẫn ----
  function openHelp() {
    if (!selectedGame) return;
    el.helpTitle.textContent = selectedGame.emoji + " " + selectedGame.name;
    const steps = selectedGame.howTo || ["Chưa có hướng dẫn cho trò này."];
    el.helpBody.innerHTML = "<ol class='help-list'>" +
      steps.map((s) => `<li>${s}</li>`).join("") +
      "</ol>";
    el.helpOverlay.classList.remove("hidden");
  }
  function closeHelp() { el.helpOverlay.classList.add("hidden"); }

  el.helpBtn.addEventListener("click", openHelp);
  el.helpClose.addEventListener("click", closeHelp);
  el.helpOk.addEventListener("click", closeHelp);
  el.helpOverlay.addEventListener("click", (e) => {
    if (e.target === el.helpOverlay) closeHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.helpOverlay.classList.contains("hidden")) closeHelp();
  });

  renderMenu();
})();
