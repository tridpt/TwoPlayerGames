/* ============================================================
   i18n: đổi ngôn ngữ Việt / Anh cho khung giao diện.
   Dùng data-i18n (textContent), data-i18n-ph (placeholder),
   data-i18n-title (title). Văn bản trong từng game vẫn giữ tiếng Việt.
   ============================================================ */
window.I18n = (function () {
  const STORE_KEY = "tpg_lang";
  const DICT = {
    vi: {
      tagline: "Chơi chung một máy hoặc online qua mạng",
      profileTitle: "Hồ sơ của bạn",
      themeTitle: "Đổi giao diện sáng/tối",
      soundTitle: "Bật/tắt âm thanh",
      langTitle: "Đổi ngôn ngữ (Việt/Anh)",
      onlineHubH: "🌐 Sảnh online",
      onlineHubP: "Tạo phòng từ một game bất kỳ hoặc nhập mã phòng để tự vào đúng game mà chủ phòng đã tạo.",
      openOnlineHub: "Tạo / vào phòng",
      searchPh: "Tìm trò chơi theo tên hoặc mô tả...",
      chipOnline: "🌐 Online",
      chipAI: "🤖 Đấu máy",
      sortLabel: "Sắp xếp:",
      sortPopular: "Phổ biến",
      sortAZ: "Tên A→Z",
      sortNew: "Mới nhất",
      loadMore: "Xem thêm",
      backList: "← Về danh sách",
      backMenu: "← Về menu",
      backReturn: "← Quay lại",
      exit: "← Thoát",
      yourName: "Tên của bạn",
      namePh: "Nhập tên...",
      leaderboardH: "🏆 Bảng xếp hạng game của bạn",
      settingsH: "⚙️ Cài đặt",
      volume: "🔊 Âm lượng",
      sfx: "🎚️ Hiệu ứng âm thanh",
      music: "🎵 Nhạc nền",
      achievementsH: "🏅 Thành tích",
      historyH: "📜 Lịch sử ván đấu",
      howToH: "📖 Cách chơi",
      playNow: "▶ Chơi ngay",
      optionsTitle: "⚙️ Tùy chỉnh ván chơi",
      modeLocalH: "Chơi chung máy",
      modeLocalP: "Hai người luân phiên trên cùng một thiết bị.",
      modeAIH: "Đấu với máy",
      modeAIP: "Chơi một mình với máy tính (AI). Bạn cầm quân đi trước.",
      aiEasy: "🟢 Dễ",
      aiNormal: "🟡 Vừa",
      aiHard: "🔴 Khó",
      aiLevelTitle: "Mức độ khó",
      modeOnlineH: "Chơi online",
      modeOnlineP: "Hai người ở hai máy khác nhau, kết nối qua mã phòng.",
      createRoomH: "Tạo phòng mới",
      createRoomP: "Chọn game, chỉnh luật nếu có, rồi gửi mã phòng cho bạn bè.",
      gameToCreate: "Game tạo phòng",
      publicLabel: "🌐 Phòng công khai (cho người khác tìm thấy)",
      createRoom: "Tạo phòng",
      yourRoomCode: "Mã phòng của bạn",
      copyCode: "📋 Sao chép",
      waiting: "Đang chờ người chơi thứ hai...",
      joinRoomH: "Vào phòng có sẵn",
      joinRoomP: "Nhập mã phòng (4 chữ số) mà bạn của bạn gửi cho.",
      joinRoom: "Vào phòng",
      refresh: "🔄 Làm mới",
      helpTitle: "Hướng dẫn chơi",
      undo: "↶ Hoàn tác",
      undoTitle: "Hoàn tác nước đi",
      restart: "↻ Chơi lại",
      footer: "Made with ❤️ — chơi chung máy hoặc online",
      helpOk: "Đã hiểu, chơi thôi!",
      closeTitle: "Đóng",
      winReplay: "🎬 Xem lại ván",
      replayTitle: "🎬 Xem lại ván",
      replayPlay: "▶ Phát",
      tourSkip: "Bỏ qua",
      tourNext: "Tiếp",
      replayTour: "🧭 Xem lại hướng dẫn",
      replayTourBtn: "▶ Bắt đầu",
      activityH: "📊 Hoạt động 14 ngày gần đây",
      filterAllGames: "Tất cả trò chơi",
      filterAllModes: "Tất cả chế độ",
      filterLocal: "👥 Chung máy",
      filterAI: "🤖 Đấu máy",
      filterOnline: "🌐 Online",
      share: "📤 Chia sẻ",
      shareCode: "📤 Chia sẻ",
      shareCopied: "✓ Đã sao chép vào clipboard",
      shareResultText: "Mình vừa chơi {game} trên Game 2 Người — {result}!",
      shareRoomText: "Vào chơi cùng mình! Mã phòng {code}: {url}",
      egName1: "Ví dụ: Nam",
      egName2: "Ví dụ: Linh",
    },
    en: {
      tagline: "Play on one device or online over the network",
      profileTitle: "Your profile",
      themeTitle: "Toggle light/dark theme",
      soundTitle: "Toggle sound",
      langTitle: "Switch language (VI/EN)",
      onlineHubH: "🌐 Online lobby",
      onlineHubP: "Create a room from any game, or enter a room code to auto-join the game the host picked.",
      openOnlineHub: "Create / join room",
      searchPh: "Search games by name or description...",
      chipOnline: "🌐 Online",
      chipAI: "🤖 Vs CPU",
      sortLabel: "Sort:",
      sortPopular: "Popular",
      sortAZ: "Name A→Z",
      sortNew: "Newest",
      loadMore: "Show more",
      backList: "← Back to list",
      backMenu: "← Back to menu",
      backReturn: "← Back",
      exit: "← Exit",
      yourName: "Your name",
      namePh: "Enter name...",
      leaderboardH: "🏆 Your game leaderboard",
      settingsH: "⚙️ Settings",
      volume: "🔊 Volume",
      sfx: "🎚️ Sound effects",
      music: "🎵 Background music",
      achievementsH: "🏅 Achievements",
      historyH: "📜 Match history",
      howToH: "📖 How to play",
      playNow: "▶ Play now",
      optionsTitle: "⚙️ Match options",
      modeLocalH: "Local (same device)",
      modeLocalP: "Two players take turns on the same device.",
      modeAIH: "Vs computer",
      modeAIP: "Play solo against the computer (AI). You move first.",
      aiEasy: "🟢 Easy",
      aiNormal: "🟡 Normal",
      aiHard: "🔴 Hard",
      aiLevelTitle: "Difficulty",
      modeOnlineH: "Play online",
      modeOnlineP: "Two players on different devices, connected by a room code.",
      createRoomH: "Create a new room",
      createRoomP: "Pick a game, tweak the rules, then share the room code with friends.",
      gameToCreate: "Game to host",
      publicLabel: "🌐 Public room (let others find it)",
      createRoom: "Create room",
      yourRoomCode: "Your room code",
      copyCode: "📋 Copy",
      waiting: "Waiting for a second player...",
      joinRoomH: "Join an existing room",
      joinRoomP: "Enter the 4-digit room code your friend sent you.",
      joinRoom: "Join room",
      refresh: "🔄 Refresh",
      helpTitle: "How to play",
      undo: "↶ Undo",
      undoTitle: "Undo move",
      restart: "↻ Restart",
      footer: "Made with ❤️ — local or online play",
      helpOk: "Got it, let's play!",
      closeTitle: "Close",
      winReplay: "🎬 Watch replay",
      replayTitle: "🎬 Match replay",
      replayPlay: "▶ Play",
      tourSkip: "Skip",
      tourNext: "Next",
      replayTour: "🧭 Replay the tour",
      replayTourBtn: "▶ Start",
      activityH: "📊 Activity in the last 14 days",
      filterAllGames: "All games",
      filterAllModes: "All modes",
      filterLocal: "👥 Local",
      filterAI: "🤖 Vs CPU",
      filterOnline: "🌐 Online",
      share: "📤 Share",
      shareCode: "📤 Share",
      shareCopied: "✓ Copied to clipboard",
      shareResultText: "I just played {game} on Two-Player Games — {result}!",
      shareRoomText: "Come play with me! Room code {code}: {url}",
      egName1: "e.g. Alex",
      egName2: "e.g. Sam",
    },
  };

  let lang = "vi";
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === "vi" || saved === "en") lang = saved;
  } catch (e) { /* ignore */ }

  const listeners = [];

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || DICT.vi[key] || key;
  }
  function getLang() { return lang; }
  function setLang(next) {
    if (next !== "vi" && next !== "en") return;
    lang = next;
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* ignore */ }
    apply();
    listeners.forEach((fn) => { try { fn(lang); } catch (e) { /* ignore */ } });
  }
  function toggle() { setLang(lang === "vi" ? "en" : "vi"); }
  function onChange(fn) { if (typeof fn === "function") listeners.push(fn); }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    scope.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
    try { document.documentElement.lang = lang; } catch (e) { /* ignore */ }
  }

  return { t, getLang, setLang, toggle, onChange, apply };
})();
