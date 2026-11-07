/* Ranked integration: the server accepts only legal moves and derives ELO
   from the terminal board. Client-supplied result/round cannot award points. */
"use strict";
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");

const PORT = 8801;
const HOST = "127.0.0.1";
const WS_URL = `ws://${HOST}:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tpg-elo-"));

function httpReq(method, urlPath, { token, body } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    if (token) headers.Authorization = "Bearer " + token;
    const r = http.request({ host: HOST, port: PORT, method, path: urlPath, headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        let json = {};
        try { json = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { /* ignore */ }
        resolve({ status: res.statusCode, json });
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

function open() {
  return new Promise((res, rej) => {
    const ws = new WebSocket(WS_URL);
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

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR },
    stdio: "ignore",
  });
  const sockets = [];
  await new Promise((r) => setTimeout(r, 700));
  try {
    const rA = await httpReq("POST", "/api/register", { body: { username: "alice", password: "secret123" } });
    const rB = await httpReq("POST", "/api/register", { body: { username: "bob", password: "secret123" } });
    const tokenA = rA.json.token;
    const tokenB = rB.json.token;
    log(!!tokenA && !!tokenB, "dang ky hai tai khoan");

    const a = await open(); sockets.push(a);
    const createdP = next(a, "created");
    a.send(JSON.stringify({ type: "create", gameId: "tictactoe", playerName: "Alice", auth: tokenA }));
    const created = await createdP;
    const b = await open(); sockets.push(b);
    const startA = next(a, "start");
    const startB = next(b, "start");
    b.send(JSON.stringify({ type: "join", code: created.code, playerName: "Bob", auth: tokenB }));
    const [sA, sB] = await Promise.all([startA, startB]);
    log(sA.ranked === true && sB.ranked === true, "hai tai khoan trong game co bo kiem tra -> ranked");

    // Old clients can still send reportResult, but the server ignores it.
    a.send(JSON.stringify({ type: "reportResult", outcome: "win", round: 999 }));
    b.send(JSON.stringify({ type: "reportResult", outcome: "lose", round: 999 }));
    const before = await httpReq("GET", "/api/rating", { token: tokenA });
    log(before.json.played === 0, "bao cao ket qua tu client khong the tu ghi ELO");

    const sessions = [a, b];
    const wrong = sessions[1 - sA.firstSeat];
    const invalid = next(wrong, "error");
    wrong.send(JSON.stringify({ type: "move", move: { k: "p", i: 8 } }));
    const invalidReply = await invalid;
    log(/không hợp lệ/.test(invalidReply.message), "server tu choi nuoc sai luot");

    const moves = [[0, 0], [1, 3], [0, 1], [1, 4], [0, 2]];
    let ratedA, ratedB;
    for (let i = 0; i < moves.length; i++) {
      if (i === moves.length - 1) {
        ratedA = next(sessions[0], "rated");
        ratedB = next(sessions[1], "rated");
      }
      const [gameSeat, cell] = moves[i];
      const senderRoomSeat = gameSeat === 0 ? sA.firstSeat : 1 - sA.firstSeat;
      const sender = sessions[senderRoomSeat];
      const receiver = sessions[1 - senderRoomSeat];
      const relay = next(receiver, "move");
      sender.send(JSON.stringify({ type: "move", move: { k: "p", i: cell } }));
      const received = await relay;
      log(received.move.i === cell, `nuoc hop le ${i + 1} duoc relay`);

      if (i === 1) {
        const disconnected = next(b, "opponent_disconnected");
        a.close();
        await disconnected;
        const aRejoined = await open(); sockets.push(aRejoined);
        const rejoined = next(aRejoined, "rejoined");
        const reconnected = next(b, "opponent_reconnected");
        aRejoined.send(JSON.stringify({ type: "rejoin", code: created.code, seat: 0, token: created.token }));
        const resumed = await rejoined;
        await reconnected;
        log(resumed.ranked === true && resumed.history.length === 2, "tai lai phien giu ranked va lich su nuoc di");
        sessions[0] = aRejoined;
      }
    }

    const [scoreA, scoreB] = await Promise.all([ratedA, ratedB]);
    const winnerRoomSeat = sA.firstSeat;
    log(scoreA.result === (winnerRoomSeat === 0 ? "win" : "lose") &&
      scoreB.result === (winnerRoomSeat === 1 ? "win" : "lose"), "server tu xac dinh nguoi thang theo firstSeat");
    log(scoreA.round === 1 && scoreB.round === 1, "ELO chi ghi cho van hien tai");

    const winnerName = winnerRoomSeat === 0 ? "alice" : "bob";
    const lb = await httpReq("GET", "/api/leaderboard?game=tictactoe&limit=10");
    log(lb.json.rows.length === 2 && lb.json.rows[0].username === winnerName, "leaderboard theo ket qua duoc kiem chung");

    // A fabricated future round and extra moves cannot award another result.
    sessions[0].send(JSON.stringify({ type: "reportResult", outcome: "win", round: 999 }));
    sessions[1].send(JSON.stringify({ type: "reportResult", outcome: "lose", round: 999 }));
    const afterGameError = next(sessions[0], "error");
    sessions[0].send(JSON.stringify({ type: "move", move: { k: "p", i: 8 } }));
    await afterGameError;
    const after = await httpReq("GET", "/api/rating", { token: tokenA });
    log(after.json.played === 1, "khong tinh diem lap lai hay tu round gia");

    const restartA = next(sessions[0], "restart");
    const restartB = next(sessions[1], "restart");
    sessions[0].send(JSON.stringify({ type: "restart" }));
    sessions[1].send(JSON.stringify({ type: "restart" }));
    const [newA, newB] = await Promise.all([restartA, restartB]);
    log(newA.ranked === true && newB.ranked === true && newA.round === 2, "choi lai reset bo kiem tra va giu ranked");

    // Ván thứ hai thắng theo đường chéo phải được chấm điểm như đường thẳng.
    let secondRatedA, secondRatedB;
    for (const [index, [gameSeat, cell]] of [[0, 0], [1, 1], [0, 4], [1, 3], [0, 8]].entries()) {
      if (index === 4) {
        secondRatedA = next(sessions[0], "rated");
        secondRatedB = next(sessions[1], "rated");
      }
      const senderRoomSeat = gameSeat === 0 ? newA.firstSeat : 1 - newA.firstSeat;
      const relay = next(sessions[1 - senderRoomSeat], "move");
      sessions[senderRoomSeat].send(JSON.stringify({ type: "move", move: { k: "p", i: cell } }));
      await relay;
    }
    const [secondA, secondB] = await Promise.all([secondRatedA, secondRatedB]);
    log(secondA.round === 2 && secondB.round === 2, "thang duong cheo duoc ghi ELO o van moi");
    const afterDiagonal = await httpReq("GET", "/api/rating", { token: tokenA });
    log(afterDiagonal.json.played === 2, "moi van hoan tat chi duoc tinh mot lan");

    console.log(process.exitCode ? "FAIL" : "ALL PASS");
  } catch (e) {
    console.error("ERR", e.message);
    process.exitCode = 1;
  } finally {
    sockets.forEach((ws) => { try { ws.close(); } catch { /* ignore */ } });
    srv.kill();
    const tempRoot = fs.realpathSync(os.tmpdir());
    const resolvedDataDir = fs.realpathSync(DATA_DIR);
    if (resolvedDataDir.startsWith(tempRoot + path.sep)) {
      try { fs.rmSync(resolvedDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  }
})();
