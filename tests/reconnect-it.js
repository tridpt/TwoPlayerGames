/* Integration test: tạo phòng, đi nước, rớt mạng, kết nối lại + nhận lịch sử.
   Chạy: node tests/reconnect-it.js  (tự spawn server trên cổng test) */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8799;
const URL = `ws://localhost:${PORT}`;
let server, failed = false;

function log(ok, msg) { console.log((ok ? "✔ " : "✖ ") + msg); if (!ok) failed = true; }
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
function open() {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL);
    ws.on("open", () => res(ws));
    ws.on("error", rej);
  });
}
function next(ws, type, timeout = 2000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout chờ " + type)), timeout);
    function onMsg(raw) {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.type === type) { clearTimeout(t); ws.off("message", onMsg); res(m); }
    }
    ws.on("message", onMsg);
  });
}

(async () => {
  server = spawn("node", [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await wait(700);
  try {
    const a = await open();
    a.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "A" }));
    const created = await next(a, "created");
    log(!!created.token && created.seat === 0, "tạo phòng có token + seat 0");
    const code = created.code, token = created.token;

    const b = await open();
    b.send(JSON.stringify({ type: "join", code, playerName: "B" }));
    const joined = await next(b, "joined");
    await next(a, "start");
    log(true, "đối thủ vào phòng, cả hai start");

    // A đi 1 nước
    a.send(JSON.stringify({ type: "move", move: { r: 0, c: 0 } }));
    const mvB = await next(b, "move");
    log(mvB.move && mvB.move.r === 0, "nước đi được relay sang đối thủ");
    const response = next(a, "move");
    b.send(JSON.stringify({ type: "move", move: { r: 1, c: 1 } }));
    await response;

    // A rớt mạng
    a.close();
    const dc = await next(b, "opponent_disconnected");
    log(dc.seat === 0, "đối thủ nhận opponent_disconnected");

    // A kết nối lại bằng token
    const a2 = await open();
    a2.send(JSON.stringify({ type: "rejoin", code, seat: 0, token }));
    const rej = await next(a2, "rejoined");
    log(rej.history && rej.history.length === 2 && rej.history[0].r === 0
      && rej.historySeats?.join(",") === "0,1" && rej.historyStart === 0
      && rej.opponentConnected === true,
    "rejoin nhận lịch sử cùng ghế người gửi từng nước");
    const rc = await next(b, "opponent_reconnected");
    log(rc.seat === 0, "đối thủ nhận opponent_reconnected");

    // rejoin sai token -> thất bại
    const c = await open();
    c.send(JSON.stringify({ type: "rejoin", code, seat: 1, token: "sai" }));
    const fail = await next(c, "rejoin_failed");
    log(!!fail, "rejoin sai token -> rejoin_failed");

    // Chỗ của B phải được giữ riêng trong thời gian chờ kết nối lại.
    const dcGuest = next(a2, "opponent_disconnected");
    b.close();
    await dcGuest;
    const joinDenied = next(c, "error");
    c.send(JSON.stringify({ type: "join", code, playerName: "C" }));
    const denied = await joinDenied;
    log(/phòng|chỗ|kết nối lại/i.test(denied.message || ""), "người lạ không thể chiếm chỗ của người vừa rớt mạng");
    const b2 = await open();
    const restored = next(b2, "rejoined");
    b2.send(JSON.stringify({ type: "rejoin", code, seat: 1, token: joined.token }));
    const guestAgain = await restored;
    log(guestAgain.seat === 1 && guestAgain.history.length === 2
      && guestAgain.historySeats?.join(",") === "0,1", "khách cũ vẫn kết nối lại được bằng token");

    // Khi cả hai cùng mất mạng, phòng vẫn phải tồn tại trong thời gian ân hạn.
    a2.close(); b2.close();
    await wait(150);
    const a3 = await open();
    const hostRestored = next(a3, "rejoined");
    a3.send(JSON.stringify({ type: "rejoin", code, seat: 0, token }));
    const hostAgain = await hostRestored;
    log(hostAgain.opponentConnected === false, "nguoi vao lai truoc duoc bao doi thu van mat ket noi");
    const b3 = await open();
    const guestRestored = next(b3, "rejoined");
    b3.send(JSON.stringify({ type: "rejoin", code, seat: 1, token: joined.token }));
    await guestRestored;
    log(true, "hai nguoi cung mat mang van ket noi lai duoc trong thoi gian an han");

    const restartA = next(a3, "restart");
    const restartB = next(b3, "restart");
    a3.send(JSON.stringify({ type: "restart" }));
    b3.send(JSON.stringify({ type: "restart" }));
    await Promise.all([restartA, restartB]);
    const lastDisconnect = next(b3, "opponent_disconnected");
    a3.close();
    await lastDisconnect;
    const a4 = await open();
    const emptyHistory = next(a4, "rejoined");
    a4.send(JSON.stringify({ type: "rejoin", code, seat: 0, token }));
    const afterRestart = await emptyHistory;
    log(afterRestart.history.length === 0 && afterRestart.historySeats.length === 0
      && afterRestart.historyStart === 0,
    "ván chơi lại xóa nước, ghế và mốc lịch sử");

    a4.close(); b3.close(); c.close();
  } catch (e) {
    log(false, "Lỗi: " + e.message);
  }
  server.kill();
  await wait(200);
  console.log(failed ? "FAILED" : "ALL PASS");
  process.exit(failed ? 1 : 0);
})();
