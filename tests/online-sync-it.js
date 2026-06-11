/* Kiểm tra tích hợp ĐỒNG BỘ cho các game online mới: tạo phòng cho từng game,
   relay một nước đi đặc trưng và xác minh đối thủ nhận ĐÚNG payload (giữ nguyên
   cấu trúc). Server là relay game-agnostic nên test này bảo chứng rằng các hành
   động (die / bid / guess / hit / ask...) đi qua mạng không bị biến dạng. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8796;
const URL = `ws://127.0.0.1:${PORT}`;

function open() {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL);
    ws.on("open", () => res(ws));
    ws.on("error", rej);
  });
}
function next(ws, type) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error("timeout " + type)), 3000);
    const on = (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.type === type) { clearTimeout(to); ws.off("message", on); res(m); }
    };
    ws.on("message", on);
  });
}
function log(ok, msg) { console.log((ok ? "\u2714 " : "\u2718 ") + msg); if (!ok) process.exitCode = 1; }

// một nước đi mẫu cho mỗi game online mới
const CASES = [
  { gameId: "snakesladders", move: { die: 5 }, check: (m) => m.move.die === 5 },
  { gameId: "liarsdice", move: { k: "bid", qty: 3, face: 4 }, check: (m) => m.move.k === "bid" && m.move.qty === 3 && m.move.face === 4 },
  { gameId: "codebreakerduel", move: { k: "guess", code: [0, 1, 2, 3] }, check: (m) => m.move.k === "guess" && Array.isArray(m.move.code) && m.move.code.length === 4 },
  { gameId: "blackjackduel", move: { k: "hit" }, check: (m) => m.move.k === "hit" },
  { gameId: "twentyquestions", move: { k: "ask", text: "Nó có sống không?" }, check: (m) => m.move.k === "ask" && m.move.text.length > 0 },
  { gameId: "wordduel", move: { k: "word", idx: [0, 1] }, check: (m) => m.move.k === "word" && m.move.idx.length === 2 },
  { gameId: "numberduel", move: { k: "pick", n: 4 }, check: (m) => m.move.k === "pick" && m.move.n === 4 },
  { gameId: "prisonersdilemma", move: { k: "pick", c: "D" }, check: (m) => m.move.k === "pick" && m.move.c === "D" },
  { gameId: "rpsplus", move: { k: "pick", c: "R" }, check: (m) => m.move.k === "pick" && m.move.c === "R" },
];

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 700));
  try {
    for (const c of CASES) {
      const a = await open();
      a.send(JSON.stringify({ type: "create", gameId: c.gameId, playerName: "A" }));
      const created = await next(a, "created");

      const b = await open();
      const startA = next(a, "start");
      b.send(JSON.stringify({ type: "join", code: created.code, playerName: "B" }));
      await next(b, "joined");
      const startMsg = await startA;
      log(startMsg.gameId === c.gameId, `${c.gameId}: tao phong + ca hai vao start dung game`);

      // A gửi nước -> B nhận đúng payload
      const bMove = next(b, "move");
      a.send(JSON.stringify({ type: "move", move: c.move }));
      const got = await bMove;
      log(!!got.move && c.check(got), `${c.gameId}: nuoc di relay sang doi thu giu nguyen payload`);

      a.close(); b.close();
      await new Promise((r) => setTimeout(r, 120));
    }
    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    srv.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
