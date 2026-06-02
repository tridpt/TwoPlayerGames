/* ============================================================
   Server: phục vụ web tĩnh + WebSocket relay cho chơi online
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8777;
const ROOT = __dirname;

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
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // chặn path traversal
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
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

/** rooms: code -> { players: [ws, ws], gameId, seed } */
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
  if (!room) return;
  const opp = otherPlayer(room, ws);
  send(opp, "opponent_left");
  rooms.delete(code);
}

wss.on("connection", (ws) => {
  ws.roomCode = null;
  ws.seat = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case "create": {
        const code = makeCode();
        const seed = Math.floor(Math.random() * 1e9);
        const options = msg.options || {};
        rooms.set(code, { players: [ws, null], gameId: msg.gameId, seed, options });
        ws.roomCode = code;
        ws.seat = 0;
        send(ws, "created", { code, seat: 0, gameId: msg.gameId, seed, options });
        break;
      }

      case "join": {
        const room = rooms.get(msg.code);
        if (!room) return send(ws, "error", { message: "Mã phòng không tồn tại." });
        if (room.players[1]) return send(ws, "error", { message: "Phòng đã đủ người." });
        room.players[1] = ws;
        ws.roomCode = msg.code;
        ws.seat = 1;
        send(ws, "joined", { code: msg.code, seat: 1, gameId: room.gameId, seed: room.seed, options: room.options });
        // báo cho cả hai bắt đầu (kèm options của chủ phòng)
        send(room.players[0], "start", { seat: 0, gameId: room.gameId, seed: room.seed, options: room.options });
        send(room.players[1], "start", { seat: 1, gameId: room.gameId, seed: room.seed, options: room.options });
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
        // người chủ phòng phát seed mới để đồng bộ (giữ nguyên options)
        const seed = Math.floor(Math.random() * 1e9);
        room.seed = seed;
        room.players.forEach((p, i) => send(p, "restart", { seed, seat: i, options: room.options }));
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
