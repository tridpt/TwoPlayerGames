/* Account storage failure must return an error without crashing WebSocket play. */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");

const PORT = 8804;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tpg-storage-"));
const blockedPath = path.join(dir, "not-a-directory");
fs.writeFileSync(blockedPath, "occupied");

function health() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/health`, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode));
    }).on("error", reject);
  });
}

function open() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function next(ws, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${type}`)), 3000);
    ws.on("message", (raw) => {
      const message = JSON.parse(raw);
      if (message.type === type) { clearTimeout(timer); resolve(message); }
    });
  });
}

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: blockedPath },
    stdio: "ignore",
  });
  let ws;
  try {
    await new Promise((resolve) => setTimeout(resolve, 700));
    if (await health() !== 503) throw new Error("health phải báo storage unavailable");
    ws = await open();
    const reply = next(ws, "error");
    ws.send(JSON.stringify({ type: "create", gameId: "tictactoe", auth: "invalid-token" }));
    const error = await reply;
    if (!error.message || await health() !== 503) throw new Error("WebSocket không xử lý lỗi storage an toàn");
    const casualReply = next(ws, "created");
    ws.send(JSON.stringify({ type: "create", gameId: "tictactoe" }));
    await casualReply;
    console.log("✔ storage lỗi: health 503, WebSocket còn chạy và phòng thường vẫn tạo được");
  } catch (error) {
    console.error("✘", error.message);
    process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    server.kill();
    fs.unlinkSync(blockedPath);
    fs.rmdirSync(dir);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
