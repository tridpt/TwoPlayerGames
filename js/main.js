/* ============================================================
   Khung điều khiển chung: menu, chọn chế độ, sảnh online, vòng chơi
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    menu: $("menu"),
    gameGrid: $("gameGrid"),
    openOnlineHubBtn: $("openOnlineHubBtn"),
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
    lobbyGameSelect: $("lobbyGameSelect"),
    lobbyOptionsPanel: $("lobbyOptionsPanel"),
    lobbyOptionsList: $("lobbyOptionsList"),
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
  let lobbySelectedGame = null;
  let lobbyReturnView = "menu";
  let pendingRoomCode = null;
  let instance = null;
  let scores = [0, 0];
  let restartReadySeats = [];
  let online = null; // null = chơi chung máy; {roomSeat, seat, seed} = online
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
      games: ["battleship", "seabattleplus", "submarinehunt", "hiddenassassin", "trapmansion", "minesweeper", "treasure", "bullscows", "hangman", "noitu"],
    },
    {
      title: "Xúc xắc, bài & may rủi",
      hint: "Roll, ghi điểm, domino, đấu giá kín và lật cặp nhanh gọn.",
      games: ["auctionwar", "memory", "pig", "yahtzee", "domino"],
    },
  ];

  // ====================== Context cho game ======================
  function makeContext(seed) {
    return {
      boardEl: el.boardWrap,
      isOnline: !!online,
      mySeat: online ? online.seat : -1,
      roomSeat: online ? online.roomSeat : -1,
      firstSeat: online ? online.firstSeat : 0,
      round: online ? online.round : 1,
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

  function getGameById(id) {
    return GameRegistry.games.find((g) => g.id === id) || null;
  }

  const GAME_MARKS = {
    auctionwar: "AW",
    artillery: "AR",
    basedefenseduel: "BD",
    battleship: "BS",
    bullscows: "BC",
    checkers: "CK",
    connectfour: "C4",
    crystalconquest: "CC",
    dicebattle: "DB",
    domino: "DM",
    dotsandboxes: "DX",
    dungeonrival: "DR",
    gomoku: "5",
    hangman: "HM",
    hex: "HX",
    hiddenassassin: "HA",
    mancala: "MC",
    memory: "MM",
    minesweeper: "MS",
    morris: "MR",
    nim: "NM",
    noitu: "NT",
    orderchaos: "OC",
    pentago: "PG",
    pig: "P",
    pong: "PN",
    poolbattle: "PB",
    quoridor: "QD",
    reversi: "RV",
    seabattleplus: "SB",
    slingshotbattle: "SL",
    stratego: "ST",
    submarinehunt: "SH",
    tankarena: "TA",
    territorywar: "TW",
    tictactoe: "XO",
    timeloopduel: "TL",
    trapmansion: "TM",
    treasure: "TR",
    ultimate: "UT",
    yahtzee: "YZ",
  };

  const AVATAR_FAMILY = {
    tictactoe: "board", gomoku: "board", ultimate: "board", connectfour: "board",
    reversi: "board", pentago: "board", morris: "board", checkers: "board",
    hex: "board", quoridor: "board", mancala: "board", dotsandboxes: "board",
    orderchaos: "board", nim: "board", stratego: "board",
    tankarena: "map", dicebattle: "map", territorywar: "map", crystalconquest: "map",
    pong: "action", poolbattle: "action", slingshotbattle: "action", timeloopduel: "action", artillery: "action",
    basedefenseduel: "long", dungeonrival: "long",
    battleship: "hidden", seabattleplus: "hidden", submarinehunt: "hidden", hiddenassassin: "hidden",
    trapmansion: "hidden", minesweeper: "hidden", treasure: "hidden", bullscows: "hidden", hangman: "hidden", noitu: "hidden",
    auctionwar: "chance", memory: "chance", pig: "chance", yahtzee: "chance", domino: "chance",
  };

  function gameMark(game) {
    if (GAME_MARKS[game.id]) return GAME_MARKS[game.id];
    return game.name
      .replace(/\([^)]*\)/g, "")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function gameIconHtml(game, extraClass = "") {
    const mark = gameMark(game);
    return `<span class="game-icon game-icon-${game.id} ${extraClass}" data-mark="${mark}" aria-hidden="true"></span>`;
  }

  function gameAvatarHtml(game) {
    const family = AVATAR_FAMILY[game.id] || "board";
    const mark = gameMark(game);
    return `
      <div class="game-avatar game-avatar-${family} game-avatar-${game.id}" data-mark="${mark}" aria-hidden="true">
        <span class="avatar-orbit one"></span>
        <span class="avatar-orbit two"></span>
        <span class="avatar-piece a"></span>
        <span class="avatar-piece b"></span>
        <span class="avatar-piece c"></span>
      </div>
    `;
  }

  function setGameHeading(target, game) {
    target.innerHTML = `${gameIconHtml(game, "small")}<span>${game.name}</span>`;
  }

  function normalizeOnlineSession(m) {
    const roomSeat = typeof m.seat === "number" ? m.seat : 0;
    const firstSeat = typeof m.firstSeat === "number" ? m.firstSeat : 0;
    return {
      roomSeat,
      seat: roomSeat === firstSeat ? 0 : 1,
      firstSeat,
      seed: m.seed,
      gameId: m.gameId || selectedGame?.id,
      code: m.code || online?.code,
      round: m.round || online?.round || 1,
    };
  }

  function updateRestartButtons() {
    const onlineMode = !!online;
    const roomSeat = online?.roomSeat;
    const mineReady = onlineMode && restartReadySeats.includes(roomSeat);
    const otherReady = onlineMode && restartReadySeats.includes(1 - roomSeat);

    el.restartBtn.disabled = !!mineReady;
    el.winAgain.disabled = !!mineReady;

    if (!onlineMode) {
      el.restartBtn.textContent = "↻ Chơi lại";
      el.winAgain.textContent = "↻ Chơi lại";
    } else if (mineReady && otherReady) {
      el.restartBtn.textContent = "Đang tạo ván...";
      el.winAgain.textContent = "Đang tạo ván...";
    } else if (mineReady) {
      el.restartBtn.textContent = "✓ Chờ đối thủ";
      el.winAgain.textContent = "✓ Đã sẵn sàng";
    } else if (otherReady) {
      el.restartBtn.textContent = "✓ Đồng ý ván mới";
      el.winAgain.textContent = "✓ Đồng ý ván mới";
    } else {
      el.restartBtn.textContent = "↻ Ván mới";
      el.winAgain.textContent = "↻ Chơi lại";
    }
  }

  function applyRestartPending(m) {
    if (!online || (m.code && m.code !== online.code)) return;
    restartReadySeats = Array.isArray(m.ready) ? m.ready.filter((seat) => seat === 0 || seat === 1) : [];
    updateRestartButtons();

    const mineReady = restartReadySeats.includes(online.roomSeat);
    const otherReady = restartReadySeats.includes(1 - online.roomSeat);
    if (mineReady && !otherReady) {
      el.status.textContent = "Bạn đã đồng ý chơi lại. Đang chờ đối thủ đồng ý.";
      if (!el.winOverlay.classList.contains("hidden")) el.winSub.textContent = "Bạn đã sẵn sàng. Chờ đối thủ đồng ý để bắt đầu ván mới.";
    } else if (!mineReady && otherReady) {
      el.status.textContent = "Đối thủ muốn chơi lại. Bấm Ván mới để đồng ý.";
      if (!el.winOverlay.classList.contains("hidden")) el.winSub.textContent = "Đối thủ muốn chơi lại. Bấm Chơi lại để đồng ý.";
    } else if (mineReady && otherReady) {
      el.status.textContent = "Cả hai đã đồng ý. Đang tạo ván mới...";
    }
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
    buildLobbyGameSelect();
  }

  function buildLobbyGameSelect(preselectId = "") {
    el.lobbyGameSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Chọn game để tạo phòng";
    el.lobbyGameSelect.appendChild(placeholder);

    GameRegistry.games
      .filter((g) => g.onlineReady !== false)
      .forEach((game) => {
        const option = document.createElement("option");
        option.value = game.id;
        option.textContent = game.name;
        el.lobbyGameSelect.appendChild(option);
      });

    el.lobbyGameSelect.value = preselectId || "";
    setLobbyGame(el.lobbyGameSelect.value);
  }

  function setLobbyGame(gameId) {
    lobbySelectedGame = gameId ? getGameById(gameId) : null;
    el.createRoomBtn.disabled = !lobbySelectedGame;
    if (!lobbySelectedGame) {
      el.lobbyOptionsPanel.classList.add("hidden");
      el.lobbyOptionsList.innerHTML = "";
      return;
    }
    buildOptionsUI(lobbySelectedGame, el.lobbyOptionsPanel, el.lobbyOptionsList, "lobby_opt_");
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
      gameAvatarHtml(g) +
      `<h3>${g.name}</h3>` +
      `<p>${g.description}</p>` +
      tags.map((tag) => `<span class="tag-local">${tag}</span>`).join("");
    card.addEventListener("click", () => openMode(g));
    return card;
  }

  // ====================== Chọn chế độ ======================
  function openMode(game) {
    selectedGame = game;
    setGameHeading(el.modeTitle, game);
    // game không hỗ trợ online thì ẩn lựa chọn online
    el.modeOnline.classList.toggle("disabled", game.onlineReady === false);
    // game chỉ chơi online (giấu thông tin) thì ẩn lựa chọn chung máy
    el.modeLocal.classList.toggle("disabled", game.localReady === false);
    buildOptionsUI(game, el.optionsPanel, el.optionsList, "opt_");
    show("modeView");
  }

  // Dựng panel tùy chỉnh dựa trên schema options của game
  function buildOptionsUI(game, panelEl = el.optionsPanel, listEl = el.optionsList, prefix = "opt_") {
    listEl.innerHTML = "";
    const opts = game.options;
    if (!opts || !opts.length) {
      panelEl.classList.add("hidden");
      return;
    }
    panelEl.classList.remove("hidden");
    opts.forEach((opt) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const label = document.createElement("label");
      label.className = "option-label";
      label.textContent = opt.label;
      label.htmlFor = prefix + opt.id;
      const select = document.createElement("select");
      select.className = "option-select";
      select.id = prefix + opt.id;
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
      listEl.appendChild(row);
    });
  }

  // Đọc giá trị người dùng đã chọn từ panel
  function readOptions(game, prefix = "opt_") {
    const result = {};
    if (!game.options) return result;
    game.options.forEach((opt) => {
      const sel = document.getElementById(prefix + opt.id);
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
    startGame(null, { autoHelp: true });
  });

  el.modeOnline.addEventListener("click", () => {
    if (selectedGame.onlineReady === false) return;
    openLobby(selectedGame, "modeView");
  });

  el.openOnlineHubBtn.addEventListener("click", () => openLobby(null, "menu"));

  // ====================== Sảnh online ======================
  function openLobby(game = null, returnView = "menu") {
    leavePendingRoom();
    lobbyReturnView = returnView;
    const preselect = game?.onlineReady === false ? null : game;
    el.lobbyTitle.textContent = preselect
      ? `${preselect.name} — Tạo phòng online`
      : "Sảnh online";
    buildLobbyGameSelect(preselect?.id || "");
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

  function leavePendingRoom() {
    if (!pendingRoomCode) return;
    Net.send("leave");
    pendingRoomCode = null;
  }

  el.lobbyGameSelect.addEventListener("change", () => {
    setLobbyGame(el.lobbyGameSelect.value);
    if (lobbySelectedGame) {
      el.lobbyTitle.textContent = `${lobbySelectedGame.name} — Tạo phòng online`;
    } else {
      el.lobbyTitle.textContent = "Sảnh online";
    }
  });

  el.createRoomBtn.addEventListener("click", async () => {
    el.lobbyError.textContent = "";
    if (!lobbySelectedGame) {
      el.lobbyError.textContent = "Hãy chọn game để tạo phòng.";
      return;
    }
    leavePendingRoom();
    if (!(await ensureConnected())) return;
    selectedGame = lobbySelectedGame;
    currentOptions = readOptions(lobbySelectedGame, "lobby_opt_");
    Net.send("create", { gameId: lobbySelectedGame.id, options: currentOptions });
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
    pendingRoomCode = m.code;
    el.roomCodeVal.textContent = m.code;
    el.roomCodeBox.classList.remove("hidden");
    const game = getGameById(m.gameId);
    if (game) selectedGame = game;
    el.waitingMsg.textContent = `Đang chờ người chơi thứ hai vào ${game?.name || "phòng"}...`;
  });

  Net.on("error", (m) => { el.lobbyError.textContent = "⚠️ " + m.message; });

  Net.on("start", (m) => {
    const game = getGameById(m.gameId);
    if (!game) {
      el.lobbyError.textContent = "⚠️ Phòng này dùng game không có trong bản web hiện tại.";
      return;
    }
    selectedGame = game;
    pendingRoomCode = null;
    online = normalizeOnlineSession(m);
    if (m.options) currentOptions = m.options; // dùng tùy chỉnh của chủ phòng
    startGame(m.seed, { autoHelp: true });
  });

  Net.on("move", (m) => {
    if (instance && instance.applyMove) instance.applyMove(m.move, true);
  });

  Net.on("restart", (m) => {
    if (m.gameId) {
      const game = getGameById(m.gameId);
      if (game) selectedGame = game;
    }
    online = normalizeOnlineSession(m);
    if (m.options) currentOptions = m.options;
    startGame(m.seed);
  });

  Net.on("restart_pending", applyRestartPending);

  Net.on("opponent_left", () => {
    if (!online) return;
    restartReadySeats = [];
    updateRestartButtons();
    el.restartBtn.disabled = true;
    el.winAgain.disabled = true;
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
  function startGame(seed, opts = {}) {
    el.boardWrap.innerHTML = "";
    el.status.textContent = "";
    restartReadySeats = [];
    el.restartBtn.disabled = false;
    el.winAgain.disabled = false;
    el.scoreP1.classList.remove("active");
    el.scoreP2.classList.remove("active");
    if (el.winOverlay) { el.winOverlay.classList.add("hidden"); stopConfetti(); }
    scores = [0, 0];
    renderScores();
    setGameHeading(el.gameTitle, selectedGame);

    if (online) {
      el.onlineBadge.classList.remove("hidden");
      const orderText = online.seat === 0 ? "đi trước" : "đi sau";
      el.onlineBadge.textContent = `Online — bạn là Người chơi ${online.seat + 1} ván này (${orderText})`;
      el.chatPanel.classList.remove("hidden", "collapsed");
      el.chatToggle.textContent = "▾";
      if (el.chatMessages.childElementCount === 0) buildQuickButtons();
    } else {
      el.onlineBadge.classList.add("hidden");
      el.restartBtn.textContent = "↻ Chơi lại";
      el.chatPanel.classList.add("hidden");
    }

    updateRestartButtons();

    const ctx = makeContext(seed);
    ctx.setNames("Người chơi 1", "Người chơi 2");
    instance = selectedGame.create(ctx);
    show("gameView");
    if (opts.autoHelp) {
      setTimeout(openHelp, 0);
    }
  }

  function restartGame() {
    if (!selectedGame) return;
    if (online) {
      // Online rematch: gửi phiếu đồng ý, server chỉ reset khi đủ hai người.
      if (restartReadySeats.includes(online.roomSeat)) return;
      Net.send("restart");
      restartReadySeats = Array.from(new Set([...restartReadySeats, online.roomSeat]));
      updateRestartButtons();
      el.status.textContent = "Bạn đã đồng ý chơi lại. Đang chờ đối thủ đồng ý.";
      if (!el.winOverlay.classList.contains("hidden")) {
        el.winSub.textContent = "Bạn đã sẵn sàng. Chờ đối thủ đồng ý để bắt đầu ván mới.";
      }
      return;
    }
    startGame();
  }

  function goHome() {
    leavePendingRoom();
    if (online) { Net.send("leave"); online = null; }
    restartReadySeats = [];
    el.chatMessages.innerHTML = "";
    el.chatPanel.classList.add("hidden");
    selectedGame = null;
    lobbySelectedGame = null;
    instance = null;
    show("menu");
  }

  function closeLobby() {
    leavePendingRoom();
    show(lobbyReturnView);
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
  el.lobbyBackBtn.addEventListener("click", closeLobby);
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
    setGameHeading(el.helpTitle, selectedGame);
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
    el.winEmoji.textContent = "";
    el.winEmoji.className = "win-emoji win-" + kind;
    if (kind === "draw") {
      el.winTitle.textContent = "Hòa!";
    } else if (kind === "lose") {
      el.winTitle.textContent = "Thua mất rồi!";
    } else {
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

  el.winAgain.addEventListener("click", () => {
    if (online) {
      restartGame();
      return;
    }
    hideWinScreen();
    restartGame();
  });
  el.winMenu.addEventListener("click", () => { hideWinScreen(); goHome(); });

  renderMenu();
})();
