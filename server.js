/* ============================================================
   Server: phục vụ web tĩnh + WebSocket relay cho chơi online
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8777;
const ROOT = path.resolve(__dirname);
const MAX_MESSAGE_BYTES = 12_000;
const MAX_OPTIONS_BYTES = 2_500;
const MAX_MOVE_BYTES = 4_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

// ---------- HTTP: phục vụ file tĩnh ----------
const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Bad Request");
  }
  if (urlPath === "/") urlPath = "/index.html";

  // chặn path traversal
  const filePath = path.resolve(ROOT, "." + urlPath);
  const relPath = path.relative(ROOT, filePath);
  if (relPath.startsWith("..") || path.isAbsolute(relPath)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// ---------- WebSocket: phòng chơi online ----------
const wss = new WebSocketServer({ server });

/** rooms: code -> { players: [ws, ws], names: [string, string], gameId, seed, firstSeat, restartVotes } */
const rooms = new Map();

function makeCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 chữ số
  } while (rooms.has(code));
  return code;
}

function send(ws, type, payload = {}) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function cleanPlayerName(value, fallback) {
  const name = String(value || "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return name || fallback;
}

function isValidGameId(value) {
  return typeof value === "string" && /^[a-z0-9_-]{1,40}$/i.test(value);
}

function cleanRoomCode(value) {
  const code = String(value || "").trim();
  return /^\d{4}$/.test(code) ? code : "";
}

function payloadBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Infinity;
  }
}

function cleanOptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  if (payloadBytes(value) > MAX_OPTIONS_BYTES) return null;
  return value;
}

function rateLimit(ws, key, limit, windowMs) {
  const now = Date.now();
  if (!ws.rateLimits) ws.rateLimits = new Map();
  const current = ws.rateLimits.get(key);
  if (!current || now - current.start >= windowMs) {
    ws.rateLimits.set(key, { start: now, count: 1 });
    return true;
  }
  current.count++;
  return current.count <= limit;
}

function roomFor(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room || room.players[ws.seat] !== ws) return null;
  return room;
}

function otherPlayer(room, ws) {
  return room.players.find((p) => p && p !== ws) || null;
}

function leaveRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    const opp = otherPlayer(room, ws);
    send(opp, "opponent_left");
    rooms.delete(code);
  }
  ws.roomCode = null;
  ws.seat = null;
}

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.seat = null;
  ws.isAlive = true;
  ws.rateLimits = new Map();

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    if (Buffer.byteLength(raw) > MAX_MESSAGE_BYTES) {
      send(ws, "error", { message: "Tin nhắn quá lớn." });
      return;
    }

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case "create": {
        if (!rateLimit(ws, "lobby", 18, 60_000)) return send(ws, "error", { message: "Bạn thao tác tạo/vào phòng quá nhanh. Hãy thử lại sau." });
        if (!isValidGameId(msg.gameId)) return send(ws, "error", { message: "Game không hợp lệ." });
        const options = cleanOptions(msg.options);
        if (options === null) return send(ws, "error", { message: "Tùy chỉnh ván quá lớn." });
        leaveRoom(ws);
        const code = makeCode();
        const seed = Math.floor(Math.random() * 1e9);
        const firstSeat = Math.random() < 0.5 ? 0 : 1;
        const playerName = cleanPlayerName(msg.playerName, "Người chơi 1");
        rooms.set(code, { players: [ws, null], names: [playerName, null], gameId: msg.gameId, seed, firstSeat, round: 1, restartVotes: new Set(), options });
        ws.roomCode = code;
        ws.seat = 0;
        send(ws, "created", { code, seat: 0, gameId: msg.gameId, seed, firstSeat, round: 1, options, playerNames: [playerName, null] });
        break;
      }

      case "join": {
        if (!rateLimit(ws, "lobby", 18, 60_000)) return send(ws, "error", { message: "Bạn thao tác tạo/vào phòng quá nhanh. Hãy thử lại sau." });
        const code = cleanRoomCode(msg.code);
        if (!code) return send(ws, "error", { message: "Mã phòng phải gồm 4 chữ số." });
        leaveRoom(ws);
        const room = rooms.get(code);
        if (!room) return send(ws, "error", { message: "Mã phòng không tồn tại." });
        if (room.players[1]) return send(ws, "error", { message: "Phòng đã đủ người." });
        room.players[1] = ws;
        room.names[1] = cleanPlayerName(msg.playerName, "Người chơi 2");
        ws.roomCode = code;
        ws.seat = 1;
        send(ws, "joined", { code, seat: 1, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options, playerNames: room.names });
        // báo cho cả hai bắt đầu (kèm options của chủ phòng)
        send(room.players[0], "start", { code, seat: 0, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options, playerNames: room.names });
        send(room.players[1], "start", { code, seat: 1, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options, playerNames: room.names });
        break;
      }

      case "move": {
        if (!rateLimit(ws, "move", 100, 5_000)) return;
        if (payloadBytes(msg.move) > MAX_MOVE_BYTES) return send(ws, "error", { message: "Nước đi quá lớn." });
        const room = roomFor(ws);
        if (!room) return;
        const opp = otherPlayer(room, ws);
        send(opp, "move", { move: msg.move });
        break;
      }

      case "restart": {
        if (!rateLimit(ws, "restart", 8, 30_000)) return send(ws, "error", { message: "Bạn bấm chơi lại quá nhanh. Hãy chờ một chút." });
        const room = roomFor(ws);
        if (!room) return;
        // Chơi lại online: đủ hai người đồng ý mới tạo seed mới, rồi đảo người đi trước.
        if (!room.restartVotes) room.restartVotes = new Set();
        room.restartVotes.add(ws.seat);
        const ready = Array.from(room.restartVotes);
        room.players.forEach((p) => send(p, "restart_pending", { code: ws.roomCode, ready, requester: ws.seat }));

        if (!room.players[0] || !room.players[1] || room.restartVotes.size < 2) return;

        const seed = Math.floor(Math.random() * 1e9);
        room.seed = seed;
        room.round = (room.round || 1) + 1;
        room.firstSeat = typeof room.firstSeat === "number" ? 1 - room.firstSeat : (Math.random() < 0.5 ? 0 : 1);
        room.restartVotes.clear();
        room.players.forEach((p, i) => send(p, "restart", { code: ws.roomCode, gameId: room.gameId, seed, seat: i, firstSeat: room.firstSeat, round: room.round, options: room.options, playerNames: room.names }));
        break;
      }

      case "chat": {
        if (!rateLimit(ws, "chat", 8, 10_000)) return send(ws, "error", { message: "Bạn gửi chat quá nhanh. Hãy chờ một chút." });
        const room = roomFor(ws);
        if (!room) return;
        send(otherPlayer(room, ws), "chat", { text: String(msg.text || "").slice(0, 200) });
        break;
      }

      case "leave": {
        leaveRoom(ws);
        ws.roomCode = null;
        ws.seat = null;
        break;
      }
    }
  });

  ws.on("close", () => leaveRoom(ws));
});

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch { ws.terminate(); }
  });
}, 15_000);

wss.on("close", () => clearInterval(heartbeatInterval));

server.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
  console.log(`   Mở trình duyệt và bắt đầu chơi. Ctrl+C để dừng.`);
});
