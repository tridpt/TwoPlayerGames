/* ============================================================
   Server: phục vụ web tĩnh + WebSocket relay cho chơi online
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8777;
const ROOT = path.resolve(__dirname);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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

/** rooms: code -> { players: [ws, ws], gameId, seed, firstSeat, restartVotes } */
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

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case "create": {
        if (!msg.gameId) return send(ws, "error", { message: "Thiếu game để tạo phòng." });
        leaveRoom(ws);
        const code = makeCode();
        const seed = Math.floor(Math.random() * 1e9);
        const firstSeat = Math.random() < 0.5 ? 0 : 1;
        const options = msg.options || {};
        rooms.set(code, { players: [ws, null], gameId: msg.gameId, seed, firstSeat, round: 1, restartVotes: new Set(), options });
        ws.roomCode = code;
        ws.seat = 0;
        send(ws, "created", { code, seat: 0, gameId: msg.gameId, seed, firstSeat, round: 1, options });
        break;
      }

      case "join": {
        leaveRoom(ws);
        const room = rooms.get(msg.code);
        if (!room) return send(ws, "error", { message: "Mã phòng không tồn tại." });
        if (room.players[1]) return send(ws, "error", { message: "Phòng đã đủ người." });
        room.players[1] = ws;
        ws.roomCode = msg.code;
        ws.seat = 1;
        send(ws, "joined", { code: msg.code, seat: 1, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options });
        // báo cho cả hai bắt đầu (kèm options của chủ phòng)
        send(room.players[0], "start", { code: msg.code, seat: 0, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options });
        send(room.players[1], "start", { code: msg.code, seat: 1, gameId: room.gameId, seed: room.seed, firstSeat: room.firstSeat, round: room.round, options: room.options });
        break;
      }

      case "move": {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const opp = otherPlayer(room, ws);
        send(opp, "move", { move: msg.move });
        break;
      }

      case "restart": {
        const room = rooms.get(ws.roomCode);
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
        room.players.forEach((p, i) => send(p, "restart", { code: ws.roomCode, gameId: room.gameId, seed, seat: i, firstSeat: room.firstSeat, round: room.round, options: room.options }));
        break;
      }

      case "chat": {
        const room = rooms.get(ws.roomCode);
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

server.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
  console.log(`   Mở trình duyệt và bắt đầu chơi. Ctrl+C để dừng.`);
});
