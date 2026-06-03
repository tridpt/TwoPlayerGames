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
    optionsPanel: $("optionsPanel"),
    optionsList: $("optionsList"),
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
    scoreP1: $("scoreP1"),
    scoreP2: $("scoreP2"),
    backBtn: $("backBtn"),
    restartBtn: $("restartBtn"),
    homeBtn: $("homeBtn"),
    soundToggle: $("soundToggle"),
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
    winOverlay: $("winOverlay"),
    winConfetti: $("winConfetti"),
    winEmoji: $("winEmoji"),
    winTitle: $("winTitle"),
    winSub: $("winSub"),
    winAgain: $("winAgain"),
    winMenu: $("winMenu"),
  };

  // ---- Trạng thái phiên ----
  let selectedGame = null;
  let instance = null;
  let scores = [0, 0];
  let online = null; // null = chơi chung máy; {seat, seed} = online
  let currentOptions = {}; // giá trị tùy chỉnh ván chơi đang dùng

  const GAME_GROUPS = [
    {
      title: "Cờ & chiến thuật bàn",
      hint: "Caro, cờ lật, kết nối, đặt tường và các game bàn cờ kinh điển.",
      games: ["tictactoe", "gomoku", "ultimate", "connectfour", "reversi", "pentago", "morris", "checkers", "hex", "quoridor", "mancala", "dotsandboxes", "orderchaos", "nim", "stratego"],
    },
    {
      title: "Chiến thuật trên bản đồ",
      hint: "Đi quân trên lưới, chiếm vùng, dùng tài nguyên và kỹ năng theo lượt.",
      games: ["tankarena", "dicebattle", "territorywar", "crystalconquest"],
    },
    {
      title: "Đối kháng hành động & vật lý",
      hint: "Canh lực, bắn, kéo thả, va chạm và phản xạ.",
      games: ["pong", "poolbattle", "slingshotbattle", "timeloopduel", "artillery"],
    },
    {
      title: "Ván dài & xây dựng",
      hint: "Có tiến triển lâu hơn: thủ nhà, gửi quái, đi dungeon và lên cấp.",
      games: ["basedefenseduel", "dungeonrival"],
    },
    {
      title: "Ẩn thông tin & suy luận",
      hint: "Giấu vị trí, đoán tọa độ, tìm mìn, giải từ và đọc dấu hiệu.",
      games: ["battleship", "seabattleplus", "hiddenassassin", "trapmansion", "minesweeper", "treasure", "bullscows", "hangman", "noitu"],
    },
    {
      title: "Xúc xắc, bài & may rủi",
      hint: "Roll, ghi điểm, domino và lật cặp nhanh gọn.",
      games: ["memory", "pig", "yahtzee", "domino"],
    },
  ];

  // ====================== Context cho game ======================
  function makeContext(seed) {
    return {
      boardEl: el.boardWrap,
      isOnline: !!online,
      mySeat: online ? online.seat : -1,
      rng: window.makeRng(seed || 1),
      options: currentOptions,
      setStatus(text) {
        el.status.textContent = text || "";
        // Tự động phát âm thanh + màn chúc mừng khi kết thúc ván
        if (window.Sound && text) {
          if (text.includes("💀")) Sound.play("lose");
          else if (text.includes("🎉")) Sound.play("win");
          else if (text.includes("🤝")) Sound.play("draw");
        }
        if (text && (text.includes("🎉") || text.includes("🤝") || text.includes("💀"))) {
          if (el.winOverlay.classList.contains("hidden")) {
            const kind = text.includes("🎉") ? "win" : text.includes("💀") ? "lose" : "draw";
            showWinScreen(kind, text);
          }
        }
      },
      setTurn(idx) {
        if (idx === -1) {
          el.turnBanner.textContent = "Kết thúc";
          el.turnBanner.style.color = "var(--text)";
          el.scoreP1.classList.remove("active");
          el.scoreP2.classList.remove("active");
          return;
        }
        const name = idx === 0 ? el.p1Name.textContent : el.p2Name.textContent;
        let label = "Lượt: " + name;
        if (online) label += idx === online.seat ? " (bạn)" : " (đối thủ)";
        el.turnBanner.textContent = label;
        el.turnBanner.style.color = idx === 0 ? "var(--p1)" : "var(--p2)";
        // sáng đèn thẻ điểm của người đang tới lượt
        el.scoreP1.classList.toggle("active", idx === 0);
        el.scoreP2.classList.toggle("active", idx === 1);
      },
      setNames(n1, n2) { el.p1Name.textContent = n1; el.p2Name.textContent = n2; },
      incScore(idx) { scores[idx]++; renderScores(); },
      getScore(idx) { return scores[idx]; },
      sendMove(move) { if (online) Net.send("move", { move }); },
      sound(name) { window.Sound && Sound.play(name); },
    };
  }

  function renderScores() {
    el.p1Score.textContent = scores[0];
    el.p2Score.textContent = scores[1];
  }

  // ====================== Menu chọn game ======================
  function renderMenu() {
    el.gameGrid.innerHTML = "";
    const byId = new Map(GameRegistry.games.map((g) => [g.id, g]));
    const rendered = new Set();

    GAME_GROUPS.forEach((group) => {
      const games = group.games.map((id) => byId.get(id)).filter(Boolean);
      if (!games.length) return;
      games.forEach((g) => rendered.add(g.id));
      el.gameGrid.appendChild(createGameSection(group, games));
    });

    const otherGames = GameRegistry.games.filter((g) => !rendered.has(g.id));
    if (otherGames.length) {
      el.gameGrid.appendChild(createGameSection({
        title: "Khác",
        hint: "Các game mới chưa gắn nhóm.",
      }, otherGames));
    }
  }

  function createGameSection(group, games) {
    const section = document.createElement("section");
    section.className = "game-section";
    section.innerHTML = `
      <div class="game-section-head">
        <div>
          <h2>${group.title}</h2>
          <p>${group.hint}</p>
        </div>
        <span class="game-section-count">${games.length} game</span>
      </div>
    `;

    const grid = document.createElement("div");
    grid.className = "game-section-grid";
    games.forEach((game) => grid.appendChild(createGameCard(game)));
    section.appendChild(grid);
    return section;
  }

  function createGameCard(g) {
    const card = document.createElement("div");
    card.className = "game-card";
    const tags = [];
    if (g.onlineReady === false) tags.push("chỉ chung máy");
    if (g.localReady === false) tags.push("chỉ online");
    card.innerHTML =
      `<div class="emoji">${g.emoji}</div>` +
      `<h3>${g.name}</h3>` +
      `<p>${g.description}</p>` +
      tags.map((tag) => `<span class="tag-local">${tag}</span>`).join("");
    card.addEventListener("click", () => openMode(g));
    return card;
  }

  // ====================== Chọn chế độ ======================
  function openMode(game) {
    selectedGame = game;
    el.modeTitle.textContent = game.emoji + " " + game.name;
    // game không hỗ trợ online thì ẩn lựa chọn online
    el.modeOnline.classList.toggle("disabled", game.onlineReady === false);
    // game chỉ chơi online (giấu thông tin) thì ẩn lựa chọn chung máy
    el.modeLocal.classList.toggle("disabled", game.localReady === false);
    buildOptionsUI(game);
    show("modeView");
  }

  // Dựng panel tùy chỉnh dựa trên schema options của game
  function buildOptionsUI(game) {
    el.optionsList.innerHTML = "";
    const opts = game.options;
    if (!opts || !opts.length) {
      el.optionsPanel.classList.add("hidden");
      return;
    }
    el.optionsPanel.classList.remove("hidden");
    opts.forEach((opt) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const label = document.createElement("label");
      label.className = "option-label";
      label.textContent = opt.label;
      label.htmlFor = "opt_" + opt.id;
      const select = document.createElement("select");
      select.className = "option-select";
      select.id = "opt_" + opt.id;
      select.dataset.optId = opt.id;
      opt.choices.forEach((ch) => {
        const o = document.createElement("option");
        o.value = String(ch.value);
        o.textContent = ch.label;
        if (ch.value === opt.default) o.selected = true;
        select.appendChild(o);
      });
      row.appendChild(label);
      row.appendChild(select);
      el.optionsList.appendChild(row);
    });
  }

  // Đọc giá trị người dùng đã chọn từ panel
  function readOptions(game) {
    const result = {};
    if (!game.options) return result;
    game.options.forEach((opt) => {
      const sel = document.getElementById("opt_" + opt.id);
      let val = sel ? sel.value : opt.default;
      // ép kiểu theo kiểu của default
      if (typeof opt.default === "number") val = Number(val);
      else if (typeof opt.default === "boolean") val = (val === true || val === "true");
      result[opt.id] = val;
    });
    return result;
  }

  el.modeLocal.addEventListener("click", () => {
    if (selectedGame.localReady === false) return;
    online = null;
    currentOptions = readOptions(selectedGame);
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
    currentOptions = readOptions(selectedGame);
    Net.send("create", { gameId: selectedGame.id, options: currentOptions });
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
    if (m.options) currentOptions = m.options; // dùng tùy chỉnh của chủ phòng
    startGame(m.seed);
  });

  Net.on("move", (m) => {
    if (instance && instance.applyMove) instance.applyMove(m.move, true);
  });

  Net.on("restart", (m) => {
    online = { seat: m.seat, seed: m.seed };
    if (m.options) currentOptions = m.options;
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

  Net.on("chat", (m) => {
    addChatMessage(m.text, "them");
    window.Sound && Sound.play("notify");
    // nếu chat đang thu gọn, hiện dấu báo có tin mới
    if (el.chatPanel.classList.contains("collapsed")) {
      el.chatPanel.classList.add("has-unread");
    }
  });

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
    // mở lại thì xóa dấu báo tin mới
    if (!el.chatPanel.classList.contains("collapsed")) {
      el.chatPanel.classList.remove("has-unread");
    }
  });

  // ====================== Vòng chơi ======================
  function startGame(seed) {
    el.boardWrap.innerHTML = "";
    el.status.textContent = "";
    el.scoreP1.classList.remove("active");
    el.scoreP2.classList.remove("active");
    if (el.winOverlay) { el.winOverlay.classList.add("hidden"); stopConfetti(); }
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

  // ---- Nút bật/tắt âm thanh ----
  function updateSoundIcon() {
    el.soundToggle.textContent = Sound.isEnabled() ? "🔊" : "🔇";
    el.soundToggle.classList.toggle("muted", !Sound.isEnabled());
  }
  el.soundToggle.addEventListener("click", () => {
    Sound.setEnabled(!Sound.isEnabled());
    updateSoundIcon();
  });
  updateSoundIcon();

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

  // ====================== Màn hình chúc mừng ======================
  let confettiRaf = null;
  function showWinScreen(kind, rawText) {
    // bỏ emoji đầu để lấy nội dung gọn
    const msg = rawText.replace(/^[🎉🤝💀]\s*/u, "").trim();
    if (kind === "draw") {
      el.winEmoji.textContent = "🤝";
      el.winTitle.textContent = "Hòa!";
    } else if (kind === "lose") {
      el.winEmoji.textContent = "💀";
      el.winTitle.textContent = "Thua mất rồi!";
    } else {
      el.winEmoji.textContent = "🏆";
      el.winTitle.textContent = "Chiến thắng!";
    }
    el.winSub.textContent = msg;
    el.winOverlay.classList.remove("hidden");
    if (kind !== "lose") startConfetti();
  }

  function hideWinScreen() {
    el.winOverlay.classList.add("hidden");
    stopConfetti();
  }

  function startConfetti() {
    const cv = el.winConfetti;
    const g = cv.getContext("2d");
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const colors = ["#ff5d73", "#4dd0e1", "#ffd166", "#6ee7b7", "#c9a98a", "#e9ecff"];
    const pieces = [];
    for (let i = 0; i < 140; i++) {
      pieces.push({
        x: Math.random() * cv.width,
        y: Math.random() * -cv.height,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: -0.15 + Math.random() * 0.3,
      });
    }
    let frames = 0;
    function tick() {
      g.clearRect(0, 0, cv.width, cv.height);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > cv.height + 20) { p.y = -20; p.x = Math.random() * cv.width; }
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      });
      frames++;
      // sau ~4.5s ngừng sinh, để pháo giấy rơi hết thì tự dừng nhẹ
      confettiRaf = requestAnimationFrame(tick);
    }
    stopConfetti();
    tick();
  }
  function stopConfetti() {
    if (confettiRaf) { cancelAnimationFrame(confettiRaf); confettiRaf = null; }
    const g = el.winConfetti.getContext("2d");
    g && g.clearRect(0, 0, el.winConfetti.width, el.winConfetti.height);
  }

  el.winAgain.addEventListener("click", () => { hideWinScreen(); restartGame(); });
  el.winMenu.addEventListener("click", () => { hideWinScreen(); goHome(); });

  renderMenu();
})();
