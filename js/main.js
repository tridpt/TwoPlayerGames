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
    createNameInput: $("createNameInput"),
    joinNameInput: $("joinNameInput"),
    lobbyState: $("lobbyState"),
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
    gameRoomState: $("gameRoomState"),
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
  let sessionLocked = false;
  let roomExitTimer = null;
  let online = null; // null = chơi chung máy; {roomSeat, seat, seed} = online
  let currentOptions = {}; // giá trị tùy chỉnh ván chơi đang dùng

  const PLAYER_NAME_KEY = "tpg_player_name";

  const GAME_GROUPS = [
    {
      title: "Cờ & chiến thuật bàn",
      hint: "Caro, cờ lật, kết nối, đặt tường và các game bàn cờ kinh điển.",
      games: ["tictactoe", "gomoku", "ultimate", "connectfour", "reversi", "pentago", "morris", "checkers", "isolation", "laserchess", "hex", "quoridor", "mancala", "dotsandboxes", "orderchaos", "nim", "stratego"],
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
      games: ["coopdefense", "basedefenseduel", "robotfactorywar", "dungeonrival"],
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
      setNames(n1, n2) {
        el.p1Name.textContent = labelWithPlayerName(0, n1);
        el.p2Name.textContent = labelWithPlayerName(1, n2);
      },
      incScore(idx) { scores[idx]++; renderScores(); },
      getScore(idx) { return scores[idx]; },
      sendMove(move) { if (online && !sessionLocked) Net.send("move", { move }); },
      sound(name) { window.Sound && Sound.play(name); },
    };
  }

  function renderScores() {
    el.p1Score.textContent = scores[0];
    el.p2Score.textContent = scores[1];
  }

  function cleanName(value, fallback = "Người chơi") {
    const name = String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 24);
    return name || fallback;
  }

  function loadSavedPlayerName() {
    try { return cleanName(localStorage.getItem(PLAYER_NAME_KEY) || "", ""); }
    catch { return ""; }
  }

  function savePlayerName(name) {
    try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch { /* ignore */ }
  }

  function syncNameInputs(value) {
    if (el.createNameInput && document.activeElement !== el.createNameInput) el.createNameInput.value = value;
    if (el.joinNameInput && document.activeElement !== el.joinNameInput) el.joinNameInput.value = value;
  }

  function readPlayerName(input, fallback = "Người chơi") {
    const name = cleanName(input?.value, fallback);
    if (input) input.value = name;
    savePlayerName(name);
    syncNameInputs(name);
    return name;
  }

  function setLobbyState(text, kind = "info") {
    if (!el.lobbyState) return;
    el.lobbyState.textContent = text || "";
    el.lobbyState.dataset.state = kind;
    el.lobbyState.classList.toggle("hidden", !text);
  }

  function setGameRoomState(text, kind = "info") {
    if (!el.gameRoomState) return;
    el.gameRoomState.textContent = text || "";
    el.gameRoomState.dataset.state = kind;
    el.gameRoomState.classList.toggle("hidden", !text);
  }

  function defaultSeatName(seat) {
    return `Người chơi ${seat + 1}`;
  }

  function seatName(seat) {
    return online?.playerNames?.[seat] || defaultSeatName(seat);
  }

  function opponentName() {
    return online ? seatName(1 - online.seat) : "Đối thủ";
  }

  function labelWithPlayerName(seat, label) {
    const text = String(label || defaultSeatName(seat));
    if (!online) return text;
    const name = seatName(seat);
    const playerNo = seat + 1;
    const patterns = [
      new RegExp(`Người chơi\\s*${playerNo}`, "i"),
      new RegExp(`\\bP${playerNo}\\b`, "i"),
    ];
    if (patterns.some((pattern) => pattern.test(text))) {
      return patterns.reduce((result, pattern) => result.replace(pattern, name), text);
    }
    return `${name} - ${text}`;
  }

  function applyScoreboardNames() {
    if (online) {
      el.p1Name.textContent = seatName(0);
      el.p2Name.textContent = seatName(1);
    } else {
      el.p1Name.textContent = "Người chơi 1";
      el.p2Name.textContent = "Người chơi 2";
    }
  }

  function describeOnlineGameState(kind = "live") {
    if (!online) {
      setGameRoomState("", "info");
      return;
    }
    const room = online.code ? `Mã phòng ${online.code}` : "Phòng online";
    const text = kind === "waiting"
      ? `${room}: đang chờ đối thủ.`
      : `${room}: đang chơi với ${opponentName()}.`;
    setGameRoomState(text, kind);
  }

  const savedPlayerName = loadSavedPlayerName();
  if (savedPlayerName) syncNameInputs(savedPlayerName);
  [el.createNameInput, el.joinNameInput].forEach((input) => {
    input?.addEventListener("input", () => {
      const compact = String(input.value || "").replace(/\s+/g, " ").slice(0, 24);
      if (input.value !== compact) input.value = compact;
      const name = cleanName(input.value, "");
      if (name) {
        savePlayerName(name);
        syncNameInputs(name);
      }
    });
  });

  function showToast(text) {
    const old = document.querySelector(".app-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = "app-toast";
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 220);
    }, 2800);
  }

  function clearRoomExitNotice() {
    if (roomExitTimer) {
      clearTimeout(roomExitTimer);
      roomExitTimer = null;
    }
    const notice = document.querySelector(".room-exit-notice");
    if (notice) notice.remove();
  }

  function showRoomExitNotice(message) {
    const old = document.querySelector(".room-exit-notice");
    if (old) old.remove();

    const notice = document.createElement("div");
    notice.className = "room-exit-notice";
    notice.innerHTML = `
      <div class="room-exit-card" role="alert" aria-live="assertive">
        <h2>Thông báo</h2>
        <p>${escapeHtml(message)}</p>
        <span>Đang đưa bạn về menu...</span>
      </div>
    `;
    document.body.appendChild(notice);
    setTimeout(() => notice.classList.add("show"), 10);
  }

  function clearSessionLock() {
    sessionLocked = false;
    el.boardWrap.classList.remove("session-locked");
    const lock = el.boardWrap.querySelector(".session-lock");
    if (lock) lock.remove();
  }

  function lockOnlineSession(message) {
    if (!online) return;
    if (sessionLocked) return;
    sessionLocked = true;
    restartReadySeats = [];
    updateRestartButtons();
    el.restartBtn.disabled = true;
    el.winAgain.disabled = true;
    el.status.textContent = message;
    el.turnBanner.textContent = "Ván đã dừng";
    el.scoreP1.classList.remove("active");
    el.scoreP2.classList.remove("active");
    if (instance && typeof instance.destroy === "function") instance.destroy();
    instance = null;
    el.boardWrap.innerHTML = "";
    el.boardWrap.classList.add("session-locked");

    const lock = document.createElement("div");
    lock.className = "session-lock";
    el.boardWrap.appendChild(lock);
    lock.textContent = message;
    showToast(message);
    window.Sound && Sound.play("notify");
  }

  function stopOnlineSessionAndReturn(message) {
    if (!online) return;
    lockOnlineSession(message);
    showRoomExitNotice(message);
    if (roomExitTimer) clearTimeout(roomExitTimer);
    roomExitTimer = setTimeout(() => {
      roomExitTimer = null;
      clearRoomExitNotice();
      goHome();
    }, 1700);
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
    coopdefense: "CD",
    crystalconquest: "CC",
    dicebattle: "DB",
    domino: "DM",
    dotsandboxes: "DX",
    dungeonrival: "DR",
    gomoku: "5",
    hangman: "HM",
    hex: "HX",
    hiddenassassin: "HA",
    isolation: "IS",
    laserchess: "LC",
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
    robotfactorywar: "RF",
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
    return `<div class="game-avatar game-avatar-${game.id}" aria-hidden="true">${renderGameAvatar(game.id, gameMark(game))}</div>`;
  }

  function renderGameAvatar(id, rawMark) {
    const mark = escapeHtml(rawMark);
    const p = avatarPalette(id);
    const gid = "ga-" + id.replace(/[^a-z0-9_-]/gi, "");
    return `
      <svg class="game-avatar-svg" viewBox="0 0 240 132" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="${gid}-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${p.bg1}"/>
            <stop offset="1" stop-color="${p.bg2}"/>
          </linearGradient>
          <radialGradient id="${gid}-glow" cx="76%" cy="18%" r="70%">
            <stop offset="0" stop-color="${p.b}" stop-opacity=".45"/>
            <stop offset="1" stop-color="${p.b}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="240" height="132" rx="12" fill="url(#${gid}-bg)"/>
        <rect width="240" height="132" rx="12" fill="url(#${gid}-glow)"/>
        <circle cx="206" cy="20" r="46" fill="${p.c}" opacity=".12"/>
        <path d="M0 105 C46 82 71 126 124 100 S198 75 240 93 V132 H0 Z" fill="#ffffff" opacity=".06"/>
        ${avatarScene(id, p)}
        <rect x="13" y="13" width="50" height="32" rx="8" fill="#0b1026" opacity=".78" stroke="#ffffff" stroke-opacity=".18"/>
        <text x="38" y="34" text-anchor="middle" font-size="16" font-weight="900" fill="${p.a}" font-family="Segoe UI, Arial, sans-serif">${mark}</text>
      </svg>
    `;
  }

  function avatarPalette(id) {
    const board = ["tictactoe", "gomoku", "ultimate", "connectfour", "reversi", "pentago", "morris", "checkers", "isolation", "laserchess", "hex", "quoridor", "mancala", "dotsandboxes", "orderchaos", "nim", "stratego"];
    const map = ["tankarena", "dicebattle", "territorywar", "crystalconquest"];
    const action = ["pong", "poolbattle", "slingshotbattle", "timeloopduel", "artillery"];
    const long = ["basedefenseduel", "robotfactorywar", "dungeonrival"];
    const hidden = ["battleship", "seabattleplus", "submarinehunt", "hiddenassassin", "trapmansion", "minesweeper", "treasure", "bullscows", "hangman", "noitu"];
    if (id === "auctionwar") return { a: "#ffd166", b: "#6ee7b7", c: "#ff5d73", bg1: "#202747", bg2: "#12162f" };
    if (map.includes(id)) return { a: "#6ee7b7", b: "#4dd0e1", c: "#ffd166", bg1: "#17304b", bg2: "#11182f" };
    if (action.includes(id)) return { a: "#ffd166", b: "#ff5d73", c: "#6ee7b7", bg1: "#2c254c", bg2: "#11142d" };
    if (long.includes(id) || id === "coopdefense") return { a: "#ff9f7a", b: "#6ee7b7", c: "#ffd166", bg1: "#2d2946", bg2: "#14172e" };
    if (hidden.includes(id)) return { a: "#c6a7ff", b: "#4dd0e1", c: "#ffd166", bg1: "#17243f", bg2: "#11142b" };
    if (board.includes(id)) return { a: "#ffd166", b: "#4dd0e1", c: "#ff5d73", bg1: "#242c5b", bg2: "#12152e" };
    return { a: "#ffd166", b: "#4dd0e1", c: "#ff5d73", bg1: "#202747", bg2: "#12162f" };
  }

  function avatarScene(id, p) {
    const line = `stroke="#ffffff" stroke-opacity=".18" stroke-width="2"`;
    const soft = `fill="#ffffff" opacity=".08"`;
    switch (id) {
      case "tictactoe":
        return `<g transform="translate(88 24)"><rect width="108" height="84" rx="10" fill="#0d1430" opacity=".72"/><path d="M36 10v64M72 10v64M10 28h88M10 56h88" ${line}/><text x="20" y="24" fill="${p.a}" font-size="24" font-weight="900">X</text><circle cx="55" cy="20" r="10" fill="none" stroke="${p.b}" stroke-width="5"/><text x="80" y="50" fill="${p.c}" font-size="25" font-weight="900">X</text><circle cx="22" cy="66" r="10" fill="none" stroke="${p.b}" stroke-width="5"/></g>`;
      case "gomoku":
        return `<g transform="translate(78 23)"><rect width="124" height="86" rx="10" fill="#1c2445"/><path d="M16 16h92M16 34h92M16 52h92M16 70h92M16 16v54M39 16v54M62 16v54M85 16v54M108 16v54" ${line}/><circle cx="39" cy="34" r="9" fill="${p.a}"/><circle cx="62" cy="34" r="9" fill="${p.a}"/><circle cx="85" cy="34" r="9" fill="${p.a}"/><circle cx="108" cy="34" r="9" fill="${p.a}"/><circle cx="62" cy="52" r="9" fill="${p.b}"/></g>`;
      case "connectfour":
        return `<g transform="translate(78 22)"><rect width="126" height="88" rx="12" fill="#1d3d74"/><g fill="#0b1026">${[0,1,2,3,4,5,6].map((c)=>[0,1,2,3].map((r)=>`<circle cx="${15+c*16}" cy="${18+r*16}" r="6"/>`).join("")).join("")}</g><circle cx="31" cy="66" r="6" fill="${p.a}"/><circle cx="47" cy="66" r="6" fill="${p.a}"/><circle cx="63" cy="66" r="6" fill="${p.a}"/><circle cx="79" cy="66" r="6" fill="${p.a}"/><circle cx="47" cy="50" r="6" fill="${p.c}"/><circle cx="63" cy="50" r="6" fill="${p.c}"/></g>`;
      case "ultimate":
        return `<g transform="translate(79 22)"><rect width="122" height="88" rx="10" fill="#121a36"/><path d="M45 10v68M78 10v68M10 32h102M10 56h102" ${line}/><g opacity=".95"><rect x="14" y="14" width="24" height="18" rx="3" fill="${p.a}"/><path d="M22 17v12M30 17v12M17 20h18M17 26h18" stroke="#151936" stroke-width="1.5"/><rect x="49" y="36" width="24" height="18" rx="3" fill="${p.b}"/><path d="M57 39v12M65 39v12M52 42h18M52 48h18" stroke="#151936" stroke-width="1.5"/><rect x="83" y="58" width="24" height="18" rx="3" fill="${p.c}"/><path d="M91 61v12M99 61v12M86 64h18M86 70h18" stroke="#151936" stroke-width="1.5"/></g></g>`;
      case "reversi":
        return `<g transform="translate(82 24)"><rect width="116" height="84" rx="10" fill="#14533d"/><path d="M29 8v68M58 8v68M87 8v68M8 28h100M8 56h100" ${line}/><circle cx="30" cy="28" r="13" fill="#f4f1dd"/><circle cx="58" cy="28" r="13" fill="#0b1026"/><circle cx="58" cy="56" r="13" fill="#f4f1dd"/><circle cx="86" cy="56" r="13" fill="#0b1026"/><path d="M31 19c16 9 16 22 0 32" fill="none" stroke="${p.a}" stroke-width="4"/></g>`;
      case "pentago":
        return `<g transform="translate(81 23)"><rect width="116" height="86" rx="10" fill="#172143"/><path d="M58 8v70M8 43h100" ${line}/><circle cx="29" cy="23" r="8" fill="${p.a}"/><circle cx="45" cy="23" r="8" fill="${p.b}"/><circle cx="29" cy="61" r="8" fill="${p.c}"/><circle cx="82" cy="61" r="8" fill="${p.a}"/><path d="M77 20a18 18 0 1 1-12 31" fill="none" stroke="${p.a}" stroke-width="5"/><path d="M66 51l-10 0l5 9" fill="${p.a}"/></g>`;
      case "morris":
        return `<g transform="translate(80 20)"><rect width="120" height="92" rx="10" fill="#151d3d"/><path d="M18 14h84v64H18zM38 30h44v32H38zM60 14v64M18 46h84" fill="none" stroke="${p.b}" stroke-width="3" opacity=".8"/><circle cx="18" cy="14" r="6" fill="${p.a}"/><circle cx="60" cy="14" r="6" fill="${p.a}"/><circle cx="102" cy="14" r="6" fill="${p.a}"/><circle cx="38" cy="62" r="6" fill="${p.c}"/><circle cx="82" cy="30" r="6" fill="${p.c}"/></g>`;
      case "checkers":
        return `<g transform="translate(82 24)"><rect width="112" height="84" rx="10" fill="#0b1026"/><g>${[0,1,2,3].map((r)=>[0,1,2,3,4].map((c)=>`<rect x="${8+c*20+(r%2)*10}" y="${8+r*17}" width="10" height="17" fill="${(r+c)%2?p.b:p.a}" opacity=".42"/>`).join("")).join("")}</g><circle cx="38" cy="32" r="12" fill="${p.c}"/><circle cx="72" cy="54" r="12" fill="${p.a}"/></g>`;
      case "isolation":
        return `<g transform="translate(80 22)"><rect width="120" height="88" rx="10" fill="#121a36"/><path d="M20 12v64M40 12v64M60 12v64M80 12v64M100 12v64M10 24h100M10 44h100M10 64h100" ${line}/><rect x="42" y="24" width="18" height="18" rx="4" fill="#ffffff" opacity=".1"/><rect x="62" y="44" width="18" height="18" rx="4" fill="#ffffff" opacity=".1"/><rect x="82" y="24" width="18" height="18" rx="4" fill="#ffffff" opacity=".1"/><circle cx="20" cy="24" r="11" fill="${p.c}"/><circle cx="100" cy="64" r="11" fill="${p.b}"/><path d="M20 24L40 44L60 64" fill="none" stroke="${p.a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 44l-9 0l5 8" fill="${p.a}"/></g>`;
      case "laserchess":
        return `<g transform="translate(76 22)"><rect width="128" height="88" rx="10" fill="#111936"/><path d="M18 14v60M42 14v60M66 14v60M90 14v60M114 14v60M8 26h112M8 50h112M8 74h112" ${line}/><path d="M18 74H66L90 50H114" fill="none" stroke="${p.a}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="37" width="26" height="8" rx="4" fill="${p.b}" transform="rotate(-45 67 41)"/><rect x="82" y="18" width="26" height="8" rx="4" fill="${p.c}" transform="rotate(45 95 22)"/><circle cx="18" cy="74" r="11" fill="${p.c}"/><path d="M14 66h8l-4-12z" fill="#12152e"/><path d="M107 43l14 14l-14 14l-14-14z" fill="${p.b}"/></g>`;
      case "hex":
        return `<g transform="translate(84 22)" fill="none" stroke-width="3">${[0,1,2].map((r)=>[0,1,2,3].map((c)=>`<path d="M${18+c*25+r*12} ${20+r*21}l10 6v12l-10 6l-10-6v-12z" fill="${(r+c)%2?p.a:p.b}" opacity=".85"/>`).join("")).join("")}<path d="M16 85h90" stroke="${p.a}"/><path d="M118 15v78" stroke="${p.b}"/></g>`;
      case "quoridor":
        return `<g transform="translate(82 21)"><rect width="116" height="90" rx="10" fill="#172143"/><path d="M18 14h80M18 34h80M18 54h80M18 74h80M18 14v60M38 14v60M58 14v60M78 14v60M98 14v60" ${line}/><rect x="36" y="30" width="44" height="6" rx="3" fill="${p.a}"/><rect x="76" y="50" width="6" height="28" rx="3" fill="${p.c}"/><circle cx="38" cy="54" r="9" fill="${p.b}"/><circle cx="78" cy="34" r="9" fill="${p.a}"/></g>`;
      case "mancala":
        return `<g transform="translate(74 31)"><rect width="136" height="70" rx="28" fill="#7b5a36"/><ellipse cx="18" cy="35" rx="12" ry="24" fill="#3b291c"/><ellipse cx="118" cy="35" rx="12" ry="24" fill="#3b291c"/><g fill="#261812">${[0,1,2,3,4,5].map((i)=>`<ellipse cx="${36+i*13}" cy="27" rx="6" ry="9"/><ellipse cx="${36+i*13}" cy="45" rx="6" ry="9"/>`).join("")}</g><circle cx="50" cy="26" r="3" fill="${p.a}"/><circle cx="63" cy="45" r="3" fill="${p.b}"/><circle cx="89" cy="27" r="3" fill="${p.c}"/></g>`;
      case "dotsandboxes":
        return `<g transform="translate(83 25)"><rect width="112" height="82" rx="10" fill="#111936"/><g fill="${p.a}">${[0,1,2,3].map((r)=>[0,1,2,3].map((c)=>`<circle cx="${18+c*25}" cy="${14+r*18}" r="3"/>`).join("")).join("")}</g><path d="M18 14h25v18H18zM43 32h25v18H43zM68 14h25v18H68z" fill="${p.b}" opacity=".32" stroke="${p.b}" stroke-width="3"/></g>`;
      case "stratego":
        return `<g transform="translate(76 24)"><rect width="128" height="84" rx="10" fill="#172143"/><g>${[0,1,2,3].map((c)=>`<rect x="${13+c*28}" y="12" width="22" height="28" rx="5" fill="${p.c}" opacity=".85"/><rect x="${13+c*28}" y="46" width="22" height="28" rx="5" fill="${p.b}" opacity=".85"/>`).join("")}</g><path d="M65 25v32" stroke="${p.a}" stroke-width="4"/><path d="M67 27h22l-8 10l8 10H67z" fill="${p.a}"/></g>`;
      case "tankarena":
        return `<g transform="translate(74 27)"><path d="M10 20h116M10 50h116M10 80h116" stroke="#fff" stroke-opacity=".16" stroke-width="9"/><g transform="translate(35 42)"><rect width="54" height="28" rx="8" fill="${p.b}"/><rect x="12" y="-5" width="28" height="18" rx="6" fill="${p.a}"/><rect x="38" y="3" width="38" height="6" rx="3" fill="${p.a}"/></g><rect x="95" y="19" width="18" height="18" rx="4" fill="${p.c}"/></g>`;
      case "dicebattle":
        return `<g transform="translate(77 24)"><rect width="118" height="84" rx="10" fill="#121b36"/><path d="M10 28h98M10 56h98M39 8v68M69 8v68" ${line}/><rect x="19" y="17" width="32" height="32" rx="8" fill="${p.a}"/><circle cx="28" cy="26" r="3" fill="#12142b"/><circle cx="42" cy="40" r="3" fill="#12142b"/><rect x="70" y="39" width="32" height="32" rx="8" fill="${p.b}"/><circle cx="79" cy="48" r="3" fill="#12142b"/><circle cx="86" cy="55" r="3" fill="#12142b"/><circle cx="93" cy="62" r="3" fill="#12142b"/></g>`;
      case "territorywar":
        return `<g transform="translate(75 23)"><path d="M16 18h50l18 22l-28 23H18z" fill="${p.b}" opacity=".8"/><path d="M80 14h42l-4 42l-37 10l-24-26z" fill="${p.a}" opacity=".82"/><path d="M35 66h52l28-18l12 36H48z" fill="${p.c}" opacity=".75"/><path d="M64 22v70M23 58h104" stroke="#fff" stroke-opacity=".18" stroke-width="3"/></g>`;
      case "crystalconquest":
        return `<g transform="translate(78 22)"><rect width="120" height="88" rx="10" fill="#151d3a"/><path d="M61 12l24 38l-24 28l-24-28z" fill="${p.b}"/><path d="M61 12v66M37 50h48" stroke="#fff" stroke-opacity=".35" stroke-width="3"/><circle cx="25" cy="28" r="12" fill="${p.a}" opacity=".9"/><circle cx="96" cy="65" r="12" fill="${p.c}" opacity=".9"/></g>`;
      case "poolbattle":
        return `<g transform="translate(72 24)"><rect width="136" height="84" rx="28" fill="#116249"/><rect x="13" y="11" width="110" height="62" rx="20" fill="#0b3d31"/><circle cx="56" cy="43" r="11" fill="${p.a}"/><circle cx="78" cy="32" r="9" fill="${p.c}"/><circle cx="93" cy="52" r="9" fill="${p.b}"/><path d="M24 66l61-36" stroke="#f2d7a2" stroke-width="5" stroke-linecap="round"/></g>`;
      case "pong":
        return `<g transform="translate(77 25)"><rect width="122" height="82" rx="10" fill="#101832"/><path d="M61 9v64" stroke="#fff" stroke-opacity=".18" stroke-width="3" stroke-dasharray="6 6"/><rect x="14" y="24" width="8" height="34" rx="4" fill="${p.a}"/><rect x="100" y="14" width="8" height="34" rx="4" fill="${p.b}"/><circle cx="68" cy="46" r="9" fill="${p.c}"/><path d="M31 58c30-50 50-8 78-34" fill="none" stroke="${p.c}" stroke-width="3" opacity=".7"/></g>`;
      case "slingshotbattle":
        return `<g transform="translate(75 22)"><rect width="126" height="88" rx="10" fill="#151d3a"/><path d="M25 70V42M25 42l-14-18M25 42l16-18" stroke="${p.a}" stroke-width="6" stroke-linecap="round"/><path d="M38 40c33-42 72-20 83 13" fill="none" stroke="${p.c}" stroke-width="4" stroke-dasharray="7 6"/><circle cx="117" cy="56" r="11" fill="${p.b}"/><rect x="66" y="59" width="22" height="22" rx="5" fill="${p.a}" opacity=".65"/></g>`;
      case "timeloopduel":
        return `<g transform="translate(79 22)" fill="none"><circle cx="58" cy="44" r="33" stroke="${p.a}" stroke-width="7"/><circle cx="58" cy="44" r="18" stroke="${p.b}" stroke-width="5" opacity=".9"/><path d="M87 38l16 2l-10 13" fill="${p.a}" stroke="none"/><path d="M28 50l-16-2l10-13" fill="${p.b}" stroke="none"/><circle cx="58" cy="44" r="6" fill="${p.c}" stroke="none"/></g>`;
      case "artillery":
        return `<g transform="translate(72 28)"><path d="M8 70c28-35 43-15 68-32s44-8 60 32z" fill="#233f4c"/><g transform="translate(32 49)"><rect width="36" height="16" rx="6" fill="${p.a}"/><rect x="24" y="-6" width="42" height="7" rx="4" fill="${p.a}" transform="rotate(-18 24 -6)"/></g><path d="M86 31c18-24 37-27 55-10" fill="none" stroke="${p.c}" stroke-width="4" stroke-dasharray="7 6"/><circle cx="147" cy="22" r="7" fill="${p.c}"/></g>`;
      case "basedefenseduel":
        return `<g transform="translate(72 25)"><path d="M12 28h126M12 58h126" stroke="#fff" stroke-opacity=".14" stroke-width="14"/><path d="M15 74V32l22-18l22 18v42z" fill="${p.c}"/><path d="M98 74V32l22-18l22 18v42z" fill="${p.b}"/><rect x="62" y="37" width="18" height="27" rx="4" fill="${p.a}"/><circle cx="83" cy="50" r="7" fill="${p.a}"/></g>`;
      case "robotfactorywar":
        return `<g transform="translate(68 24)"><path d="M12 28h142M12 58h142" stroke="#fff" stroke-opacity=".14" stroke-width="14"/><rect x="8" y="25" width="34" height="56" rx="8" fill="${p.c}"/><rect x="122" y="25" width="34" height="56" rx="8" fill="${p.b}"/><g transform="translate(64 50)"><rect x="-18" y="-14" width="36" height="26" rx="7" fill="${p.a}"/><rect x="-10" y="-30" width="20" height="14" rx="5" fill="${p.b}"/><circle cx="-12" cy="15" r="7" fill="#10142b"/><circle cx="12" cy="15" r="7" fill="#10142b"/><path d="M16 -6h32" stroke="${p.c}" stroke-width="6" stroke-linecap="round"/></g><g transform="translate(102 50)"><rect x="-18" y="-14" width="36" height="26" rx="7" fill="${p.b}"/><rect x="-10" y="-30" width="20" height="14" rx="5" fill="${p.a}"/><circle cx="-12" cy="15" r="7" fill="#10142b"/><circle cx="12" cy="15" r="7" fill="#10142b"/><path d="M-16 -6h-32" stroke="${p.c}" stroke-width="6" stroke-linecap="round"/></g></g>`;
      case "coopdefense":
        return `<g transform="translate(68 22)"><path d="M10 26c28 12 40-15 66 0s45-9 72-2M10 52c31-10 45 15 72 0s42 11 76 0M10 78c33 10 48-15 76 0s42-10 68 2" fill="none" stroke="#593f1f" stroke-opacity=".32" stroke-width="14" stroke-linecap="round"/><path d="M10 26c28 12 40-15 66 0s45-9 72-2M10 52c31-10 45 15 72 0s42 11 76 0M10 78c33 10 48-15 76 0s42-10 68 2" fill="none" stroke="#e6c97c" stroke-width="11" stroke-linecap="round"/><rect x="4" y="33" width="16" height="48" rx="5" fill="${p.c}"/><text x="12" y="61" text-anchor="middle" font-size="9" font-weight="900" fill="#151936" font-family="Segoe UI,Arial">EX</text><g fill="${p.a}"><rect x="46" y="18" width="20" height="18" rx="5"/><rect x="85" y="55" width="20" height="18" rx="5"/><rect x="113" y="21" width="20" height="18" rx="5"/></g><g stroke="${p.a}" stroke-width="5" stroke-linecap="round"><path d="M62 23l28-7"/><path d="M101 60l31-6"/><path d="M129 26l28 8"/></g><circle cx="143" cy="25" r="7" fill="${p.b}"/><circle cx="151" cy="53" r="6" fill="${p.b}"/><circle cx="136" cy="82" r="7" fill="${p.b}"/></g>`;
      case "dungeonrival":
        return `<g transform="translate(76 22)"><rect x="10" y="12" width="40" height="30" rx="6" fill="#25304f"/><rect x="58" y="12" width="40" height="30" rx="6" fill="#25304f"/><rect x="34" y="50" width="40" height="30" rx="6" fill="#25304f"/><rect x="82" y="50" width="40" height="30" rx="6" fill="#25304f"/><path d="M50 27h8M78 42v8M74 65h8" ${line}/><circle cx="30" cy="27" r="8" fill="${p.a}"/><path d="M101 57l13 20H88z" fill="${p.c}"/><rect x="45" y="61" width="18" height="12" rx="3" fill="${p.b}"/></g>`;
      case "submarinehunt":
        return `<g transform="translate(72 23)"><rect width="136" height="86" rx="12" fill="#09243f"/><circle cx="72" cy="42" r="34" fill="none" stroke="${p.b}" stroke-width="3" opacity=".32"/><circle cx="72" cy="42" r="20" fill="none" stroke="${p.b}" stroke-width="3" opacity=".5"/><path d="M39 57h58c11 0 19-7 23-16c-17-5-31-7-47-7H39c-9 0-15 5-18 12c4 7 10 11 18 11z" fill="${p.a}"/><rect x="56" y="25" width="20" height="11" rx="4" fill="${p.a}"/><path d="M102 45l22-12v24z" fill="${p.c}"/></g>`;
      case "battleship":
      case "seabattleplus":
        return `<g transform="translate(74 22)"><rect width="130" height="88" rx="10" fill="#0b2945"/><path d="M12 22h106M12 44h106M12 66h106M34 10v68M58 10v68M82 10v68M106 10v68" ${line}/><path d="M35 52h70l-9 13H44z" fill="${p.b}"/><rect x="55" y="40" width="30" height="13" rx="4" fill="${p.b}"/><circle cx="102" cy="27" r="11" fill="none" stroke="${p.c}" stroke-width="4"/></g>`;
      case "hiddenassassin":
        return `<g transform="translate(74 22)"><rect width="132" height="88" rx="10" fill="#171936"/><g fill="${p.b}" opacity=".72">${[18,43,68,93,118].map((x,i)=>`<circle cx="${x}" cy="${32+(i%2)*22}" r="10"/>`).join("")}</g><circle cx="68" cy="54" r="13" fill="${p.c}"/><path d="M68 15v78M36 54h64" stroke="${p.a}" stroke-width="3" stroke-dasharray="6 6"/><circle cx="68" cy="54" r="30" fill="none" stroke="${p.a}" stroke-width="4" opacity=".55"/></g>`;
      case "trapmansion":
        return `<g transform="translate(76 22)"><rect width="126" height="88" rx="10" fill="#171936"/><path d="M18 16h88v56H18zM18 42h88M50 16v56M78 42v30" fill="none" stroke="${p.b}" stroke-width="5"/><path d="M33 54l8 14h-16zM92 24l8 14H84z" fill="${p.c}"/><circle cx="61" cy="28" r="7" fill="${p.a}"/></g>`;
      case "minesweeper":
        return `<g transform="translate(82 24)"><rect width="112" height="84" rx="10" fill="#121a36"/><g>${[0,1,2].map((r)=>[0,1,2,3].map((c)=>`<rect x="${12+c*23}" y="${12+r*20}" width="18" height="16" rx="4" fill="${(r+c)%2?p.b:'#263158'}" opacity=".85"/>`).join("")).join("")}</g><circle cx="73" cy="40" r="10" fill="${p.c}"/><path d="M73 25v30M58 40h30M62 29l22 22M84 29L62 51" stroke="${p.a}" stroke-width="3"/></g>`;
      case "treasure":
        return `<g transform="translate(75 23)"><path d="M18 22c36-20 69 14 104-4v68c-35 18-68-15-104 4z" fill="#d6bd7a"/><path d="M35 66c25-33 51 16 76-20" fill="none" stroke="#6b5630" stroke-width="4" stroke-dasharray="6 6"/><rect x="91" y="55" width="25" height="18" rx="4" fill="${p.a}"/><path d="M91 58h25M103 55v18" stroke="#6b5630" stroke-width="3"/><circle cx="43" cy="38" r="8" fill="${p.c}"/></g>`;
      case "bullscows":
        return `<g transform="translate(78 27)"><rect width="122" height="78" rx="10" fill="#131b36"/><rect x="22" y="22" width="78" height="38" rx="8" fill="#0b1026" stroke="${p.b}" stroke-width="4"/><text x="61" y="48" text-anchor="middle" font-size="22" font-weight="900" fill="${p.a}" font-family="Segoe UI,Arial">247</text><circle cx="24" cy="20" r="8" fill="${p.c}"/><circle cx="98" cy="62" r="8" fill="${p.c}"/></g>`;
      case "hangman":
      case "noitu":
        return `<g transform="translate(74 28)"><rect width="132" height="76" rx="10" fill="#141c38"/><rect x="16" y="20" width="26" height="22" rx="6" fill="${p.a}"/><rect x="50" y="20" width="26" height="22" rx="6" fill="${p.b}"/><rect x="84" y="20" width="26" height="22" rx="6" fill="${p.c}"/><path d="M29 56h74" stroke="#fff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/><circle cx="111" cy="56" r="8" fill="${p.b}"/></g>`;
      case "auctionwar":
        return `<g transform="translate(72 22)"><rect x="28" y="18" width="76" height="50" rx="8" fill="#f0d79c"/><path d="M28 18h76v15H28z" fill="${p.a}"/><circle cx="86" cy="44" r="14" fill="${p.b}"/><path d="M45 76l70-40" stroke="${p.c}" stroke-width="9" stroke-linecap="round"/><rect x="104" y="29" width="26" height="12" rx="4" fill="${p.c}" transform="rotate(-29 104 29)"/><circle cx="47" cy="78" r="17" fill="${p.a}"/></g>`;
      case "domino":
        return `<g transform="translate(74 30)"><rect x="24" y="12" width="42" height="68" rx="8" fill="#f4f1dd" transform="rotate(-12 24 12)"/><rect x="76" y="12" width="42" height="68" rx="8" fill="#f4f1dd" transform="rotate(12 76 12)"/><path d="M29 45h35M82 45h35" stroke="#151936" stroke-width="3"/><circle cx="43" cy="28" r="4" fill="#151936"/><circle cx="52" cy="62" r="4" fill="#151936"/><circle cx="94" cy="29" r="4" fill="#151936"/><circle cx="103" cy="62" r="4" fill="#151936"/></g>`;
      case "yahtzee":
      case "pig":
      case "memory":
        return `<g transform="translate(75 24)"><rect x="25" y="14" width="42" height="42" rx="10" fill="${p.a}"/><rect x="72" y="34" width="42" height="42" rx="10" fill="${p.b}"/><circle cx="38" cy="27" r="4" fill="#10142b"/><circle cx="54" cy="43" r="4" fill="#10142b"/><circle cx="85" cy="47" r="4" fill="#10142b"/><circle cx="93" cy="55" r="4" fill="#10142b"/><circle cx="101" cy="63" r="4" fill="#10142b"/><rect x="120" y="20" width="34" height="52" rx="8" fill="#f4e1ae" transform="rotate(10 120 20)"/></g>`;
      default:
        return `<g transform="translate(78 24)"><rect width="118" height="84" rx="10" fill="#111936"/><circle cx="37" cy="43" r="20" fill="${p.a}"/><rect x="65" y="22" width="38" height="42" rx="8" fill="${p.b}"/><path d="M33 74c26-18 52-18 78 0" fill="none" stroke="${p.c}" stroke-width="5"/></g>`;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function setGameHeading(target, game) {
    target.innerHTML = `${gameIconHtml(game, "small")}<span>${game.name}</span>`;
  }

  function normalizeOnlineSession(m) {
    const roomSeat = typeof m.seat === "number" ? m.seat : 0;
    const firstSeat = typeof m.firstSeat === "number" ? m.firstSeat : 0;
    const roomNames = Array.isArray(m.playerNames) ? m.playerNames : [];
    const normalizedRoomNames = [
      cleanName(roomNames[0], "Người chơi 1"),
      cleanName(roomNames[1], "Người chơi 2"),
    ];
    const playerNames = [
      normalizedRoomNames[firstSeat] || "Người chơi 1",
      normalizedRoomNames[1 - firstSeat] || "Người chơi 2",
    ];
    return {
      roomSeat,
      seat: roomSeat === firstSeat ? 0 : 1,
      firstSeat,
      seed: m.seed,
      gameId: m.gameId || selectedGame?.id,
      code: m.code || online?.code,
      round: m.round || online?.round || 1,
      playerNames,
      roomNames: normalizedRoomNames,
    };
  }

  function updateRestartButtons() {
    const onlineMode = !!online;
    const roomSeat = online?.roomSeat;
    const mineReady = onlineMode && restartReadySeats.includes(roomSeat);
    const otherReady = onlineMode && restartReadySeats.includes(1 - roomSeat);
    const oppName = onlineMode ? opponentName() : "đối thủ";

    if (sessionLocked) {
      el.restartBtn.disabled = true;
      el.winAgain.disabled = true;
      el.restartBtn.textContent = "Ván đã dừng";
      el.winAgain.textContent = "Ván đã dừng";
      return;
    }

    el.restartBtn.disabled = !!mineReady;
    el.winAgain.disabled = !!mineReady;

    if (!onlineMode) {
      el.restartBtn.textContent = "↻ Chơi lại";
      el.winAgain.textContent = "↻ Chơi lại";
    } else if (mineReady && otherReady) {
      el.restartBtn.textContent = "Đang tạo ván...";
      el.winAgain.textContent = "Đang tạo ván...";
    } else if (mineReady) {
      el.restartBtn.textContent = `✓ Đang chờ ${oppName}`;
      el.winAgain.textContent = "✓ Đã sẵn sàng";
    } else if (otherReady) {
      el.restartBtn.textContent = `✓ Đồng ý với ${oppName}`;
      el.winAgain.textContent = `✓ Đồng ý với ${oppName}`;
    } else {
      el.restartBtn.textContent = `↻ Chơi lại với ${oppName}`;
      el.winAgain.textContent = `↻ Chơi lại với ${oppName}`;
    }
  }

  function applyRestartPending(m) {
    if (!online || (m.code && m.code !== online.code)) return;
    restartReadySeats = Array.isArray(m.ready) ? m.ready.filter((seat) => seat === 0 || seat === 1) : [];
    updateRestartButtons();

    const mineReady = restartReadySeats.includes(online.roomSeat);
    const otherReady = restartReadySeats.includes(1 - online.roomSeat);
    const mineName = seatName(online.seat);
    const oppName = opponentName();
    if (mineReady && !otherReady) {
      const text = `Bạn đã sẵn sàng. Đang chờ ${oppName} đồng ý chơi lại.`;
      el.status.textContent = text;
      setGameRoomState(`Bạn đã sẵn sàng. Đang chờ ${oppName}.`, "waiting");
      if (!el.winOverlay.classList.contains("hidden")) el.winSub.textContent = text;
    } else if (!mineReady && otherReady) {
      const text = `${oppName} muốn chơi lại. Bấm nút để đồng ý.`;
      el.status.textContent = text;
      setGameRoomState(`${oppName} muốn chơi lại với ${mineName}.`, "waiting");
      if (!el.winOverlay.classList.contains("hidden")) el.winSub.textContent = text;
    } else if (mineReady && otherReady) {
      el.status.textContent = "Cả hai đã đồng ý. Đang tạo ván mới...";
      setGameRoomState(`Cả ${mineName} và ${oppName} đã đồng ý. Đang tạo ván mới...`, "waiting");
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
    setLobbyState("Sẵn sàng tạo phòng hoặc vào phòng bằng mã.", "info");
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
    const playerName = readPlayerName(el.createNameInput, "Người chơi 1");
    setLobbyState("Đang tạo phòng...", "waiting");
    Net.send("create", { gameId: lobbySelectedGame.id, options: currentOptions, playerName });
  });

  el.joinRoomBtn.addEventListener("click", async () => {
    el.lobbyError.textContent = "";
    const code = el.joinCodeInput.value.trim();
    if (!/^\d{4}$/.test(code)) {
      el.lobbyError.textContent = "Mã phòng phải gồm 4 chữ số.";
      return;
    }
    if (!(await ensureConnected())) return;
    const playerName = readPlayerName(el.joinNameInput, "Người chơi 2");
    setLobbyState("Đang vào phòng...", "waiting");
    Net.send("join", { code, playerName });
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
    setLobbyState(`Đã tạo phòng ${m.code}. Đang chờ đối thủ vào.`, "waiting");
  });

  Net.on("error", (m) => {
    const text = "⚠️ " + (m.message || "Có lỗi kết nối.");
    if (online) {
      showToast(text);
      el.status.textContent = text;
      return;
    }
    el.lobbyError.textContent = text;
    setLobbyState("Không thể tiếp tục. Kiểm tra mã phòng hoặc kết nối rồi thử lại.", "left");
  });

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
    setLobbyState(`Đối thủ ${opponentName()} đã vào phòng. Bắt đầu ván.`, "live");
    startGame(m.seed, { autoHelp: true });
    const joinedText = online.roomSeat === 0
      ? `${opponentName()} đã vào phòng. Bắt đầu ván.`
      : "Bạn đã vào phòng. Bắt đầu ván.";
    addChatMessage(joinedText, "sys");
    showToast(joinedText);
    if (online.roomSeat === 0 && window.Sound) Sound.play("notify");
  });

  Net.on("move", (m) => {
    if (sessionLocked) return;
    if (instance && instance.applyMove) instance.applyMove(m.move, true);
  });

  Net.on("restart", (m) => {
    if (m.gameId) {
      const game = getGameById(m.gameId);
      if (game) selectedGame = game;
    }
    online = normalizeOnlineSession(m);
    if (m.options) currentOptions = m.options;
    clearSessionLock();
    describeOnlineGameState("live");
    startGame(m.seed);
  });

  Net.on("restart_pending", applyRestartPending);

  Net.on("opponent_left", () => {
    if (!online) return;
    const name = opponentName();
    addChatMessage(`${name} đã rời phòng.`, "sys");
    setGameRoomState(`${name} đã rời phòng. Đang đưa bạn về menu.`, "left");
    stopOnlineSessionAndReturn(`${name} đã rời phòng. Ván online đã dừng.`);
  });

  Net.on("disconnected", () => {
    if (online) {
      addChatMessage("Mất kết nối tới server.", "sys");
      setGameRoomState("Mất kết nối tới server. Đang đưa bạn về menu.", "left");
      stopOnlineSessionAndReturn("Mất kết nối tới server. Ván online đã dừng.");
    }
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
      label.textContent = who === "me"
        ? `${seatName(online?.seat ?? 0)} (Bạn)`
        : opponentName();
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
    clearRoomExitNotice();
    clearSessionLock();
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
      el.onlineBadge.textContent = `Online — bạn là ${seatName(online.seat)} (${orderText})`;
      describeOnlineGameState("live");
      el.chatPanel.classList.remove("hidden", "collapsed");
      el.chatToggle.textContent = "▾";
      if (el.chatMessages.childElementCount === 0) buildQuickButtons();
    } else {
      el.onlineBadge.classList.add("hidden");
      setGameRoomState("", "info");
      el.restartBtn.textContent = "↻ Chơi lại";
      el.chatPanel.classList.add("hidden");
    }

    updateRestartButtons();

    const ctx = makeContext(seed);
    applyScoreboardNames();
    instance = selectedGame.create(ctx);
    show("gameView");
    if (opts.autoHelp) {
      setTimeout(openHelp, 0);
    }
  }

  function restartGame() {
    if (!selectedGame) return;
    if (sessionLocked) return;
    if (online) {
      // Online rematch: gửi phiếu đồng ý, server chỉ reset khi đủ hai người.
      if (restartReadySeats.includes(online.roomSeat)) return;
      Net.send("restart");
      restartReadySeats = Array.from(new Set([...restartReadySeats, online.roomSeat]));
      updateRestartButtons();
      const text = `Bạn đã sẵn sàng. Đang chờ ${opponentName()} đồng ý chơi lại.`;
      el.status.textContent = text;
      setGameRoomState(`Bạn đã sẵn sàng. Đang chờ ${opponentName()}.`, "waiting");
      if (!el.winOverlay.classList.contains("hidden")) {
        el.winSub.textContent = text;
      }
      return;
    }
    startGame();
  }

  function goHome() {
    clearRoomExitNotice();
    leavePendingRoom();
    if (online) { Net.send("leave"); online = null; }
    clearSessionLock();
    setGameRoomState("", "info");
    setLobbyState("", "info");
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
