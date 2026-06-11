"use strict";
// ---------------------------------------------------------------------------
// Phủ test "build + AI hợp lệ" cho các game CHƯA có test logic riêng.
// Mục tiêu: lá chắn chống hồi quy khi sửa game về sau — đảm bảo mỗi game:
//   • create(ctx) không ném lỗi và trả về object có applyMove (hoặc tương đương),
//   • nếu có aiMove thì gọi được và trả về nước (không ném lỗi),
//   • destroy() (nếu có) gọi được để dọn timer/RAF.
// Dùng makeCtx headless; options chọn time:0 ở game có đồng hồ để tránh treo.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const { installGlobals, loadGame, makeCtx } = require("./helpers");

installGlobals();

// Options an toàn cho từng game (time:0 cho game có đồng hồ để không tạo setInterval treo).
const SAFE_OPTS = {
  bullscows: { time: 0 },
  coopdefense: { time: 0 },
  crystalconquest: { time: 0 },
  dicebattle: { time: 0 },
  fishingfrenzy: { time: 0 },
  memory: { time: 0 },
  pentago: { time: 0 },
  tankarena: { time: 0 },
  territorywar: { time: 0 },
  yahtzee: { time: 0 },
};

// Danh sách game chưa có test riêng (xem games.test.js cho phần đã test).
const GAMES = [
  "artillery", "basedefenseduel", "battleship", "bullscows", "checkers",
  "coopdefense", "crystalconquest", "dicebattle", "dungeonrival", "fishingfrenzy",
  "hex", "hiddenassassin", "hunterswarm", "isolation", "memory",
  "orderchaos", "pentago", "pong", "poolbattle", "robotfactorywar",
  "seabattleplus", "slingshotbattle", "stratego", "submarinehunt", "tankarena",
  "territorywar", "timeloopduel", "trapmansion", "treasure", "yahtzee",
  "reactionduel", "dashdodge", "snakesladders", "liarsdice", "codebreakerduel", "blackjackduel", "twentyquestions", "wordduel", "tugofwar", "typingrace", "numberduel", "prisonersdilemma", "rpsplus", "tycoon",
];

for (const id of GAMES) {
  test(`coverage: ${id} dựng được + API hợp lệ`, () => {
    const cfg = loadGame(id);
    assert.ok(cfg && typeof cfg.create === "function", `${id}: thiếu create()`);

    const ctx = makeCtx(SAFE_OPTS[id] || {});
    let api;
    assert.doesNotThrow(() => { api = cfg.create(ctx); }, `${id}: create() ném lỗi`);
    assert.ok(api && typeof api === "object", `${id}: create() phải trả về object`);

    // Phải có ít nhất một trong các phương thức tương tác chuẩn.
    const hasEntry = ["applyMove", "aiMove", "undo", "destroy"].some((k) => typeof api[k] === "function");
    assert.ok(hasEntry, `${id}: API không có applyMove/aiMove/undo/destroy`);

    // boardEl phải được gắn nội dung (game đã render gì đó).
    assert.ok(ctx.boardEl.children.length > 0, `${id}: không render gì vào boardEl`);

    // dọn dẹp nếu có destroy
    if (typeof api.destroy === "function") {
      assert.doesNotThrow(() => api.destroy(), `${id}: destroy() ném lỗi`);
    }
  });
}

// ---- AI: gọi được và trả nước, không ném lỗi (mức Khó) ----
const AI_GAMES = ["checkers", "isolation", "orderchaos", "pentago"];
for (const id of AI_GAMES) {
  test(`coverage AI: ${id} aiMove("hard") trả nước không lỗi`, () => {
    const cfg = loadGame(id);
    const ctx = makeCtx(SAFE_OPTS[id] || {});
    const api = cfg.create(ctx);
    assert.strictEqual(typeof api.aiMove, "function", `${id}: thiếu aiMove`);
    let mv;
    assert.doesNotThrow(() => { mv = api.aiMove("hard"); }, `${id}: aiMove ném lỗi`);
    assert.ok(mv && typeof mv === "object", `${id}: aiMove phải trả về một nước (object)`);
    if (typeof api.destroy === "function") api.destroy();
  });
}
