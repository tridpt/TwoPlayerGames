"use strict";
// ---------------------------------------------------------------------------
// Test luồng REPLAY (xem lại ván online).
// Cơ chế thật trong main.js: khi chơi online, mỗi nước được đẩy qua ctx.sendMove
// và lưu vào replayMoves; khi xem lại, tạo instance mới rồi applyMove(move, true)
// lần lượt để dựng lại đúng diễn biến. Test này mô phỏng đúng vòng đó.
// ---------------------------------------------------------------------------
const { test } = require("node:test");
const assert = require("node:assert");
const { setTimeout: sleep } = require("node:timers/promises");
const { installGlobals, loadGame, makeCtx, makeRng } = require("./helpers");

installGlobals();

// ctx kiểu online cho người đi (seat). Mọi nước hợp lệ được ghi vào captured[].
function makeOnlineCtx(options, seat, captured, seed) {
  const ctx = makeCtx(options, seed);
  ctx.isOnline = true;
  ctx.mySeat = seat;
  ctx.firstSeat = 0;
  ctx.round = 1;
  ctx.sendMove = (mv) => { captured.push(mv); };
  return ctx;
}

// ctx kiểu "xem lại": không tương tác, chỉ nhận applyMove(move, true).
function makeReplayCtx(options, captured, seed) {
  const ctx = makeCtx(options, seed);
  ctx.isOnline = true;
  ctx.mySeat = -1;   // -1 => không phải lượt của ai cả, chỉ phát lại
  ctx.firstSeat = 0;
  ctx.round = 1;
  ctx.sendMove = () => { captured.push("__SHOULD_NOT_HAPPEN__"); };
  return ctx;
}

test("replay: dựng lại ván Tic-Tac-Toe khớp kết quả gốc", () => {
  const cfg = loadGame("tictactoe");
  const opts = { mode: "classic" };

  // ---- Ván gốc: X thắng hàng ngang trên cùng (0,1,2) ----
  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  // X đi (seat 0), O đi (seat 1) xen kẽ; fromRemote=false để kích hoạt sendMove
  liveApi.applyMove({ k: "p", i: 0 }, false); // X
  liveApi.applyMove({ k: "p", i: 3 }, false); // O
  liveApi.applyMove({ k: "p", i: 1 }, false); // X
  liveApi.applyMove({ k: "p", i: 4 }, false); // O
  liveApi.applyMove({ k: "p", i: 2 }, false); // X thắng

  assert.strictEqual(moves.length, 5, "phải ghi đủ 5 nước vào replay log");
  assert.strictEqual(live.scores[0], 1, "X phải thắng ở ván gốc");
  assert.match(live.status, /thắng/);

  // ---- Phát lại: instance mới + applyMove(move, true) lần lượt ----
  const sink = [];
  const replay = makeReplayCtx(opts, sink, 7);
  const replayApi = cfg.create(replay);
  moves.forEach((mv) => replayApi.applyMove(mv, true));

  assert.deepStrictEqual(sink, [], "phát lại KHÔNG được gửi lại nước nào (fromRemote=true)");
  assert.strictEqual(replay.scores[0], 1, "phát lại phải tái hiện đúng kết quả X thắng");
  assert.match(replay.status, /thắng/);
});

test("replay: phát lại từng phần (prev/next) cho trạng thái trung gian hợp lệ", () => {
  const cfg = loadGame("tictactoe");
  const opts = { mode: "classic" };

  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  liveApi.applyMove({ k: "p", i: 0 }, false);
  liveApi.applyMove({ k: "p", i: 3 }, false);
  liveApi.applyMove({ k: "p", i: 1 }, false);
  liveApi.applyMove({ k: "p", i: 4 }, false);
  liveApi.applyMove({ k: "p", i: 2 }, false);

  // Dựng lại tới mốc n nước (giống rebuildReplay(n)): tạo instance mới mỗi lần.
  function rebuildTo(n) {
    const sink = [];
    const ctx = makeReplayCtx(opts, sink, 7);
    const api = cfg.create(ctx);
    for (let i = 0; i < n; i++) api.applyMove(moves[i], true);
    return ctx;
  }

  // Dùng scores để xác định người thắng (status luôn chứa chữ "thắng" trong hướng dẫn).
  const at0 = rebuildTo(0);
  assert.strictEqual(at0.scores[0], 0, "0 nước thì chưa có người thắng");
  const at4 = rebuildTo(4);
  assert.strictEqual(at4.scores[0], 0, "sau 4 nước X chưa thắng");
  const at5 = rebuildTo(5);
  assert.strictEqual(at5.scores[0], 1, "đủ 5 nước X thắng");
});

test("replay: Connect Four dựng lại khớp chuỗi nước (thắng dọc)", () => {
  const cfg = loadGame("connectfour");
  const opts = {};

  const moves = [];
  const live = makeOnlineCtx(opts, 0, moves, 7);
  const liveApi = cfg.create(live);
  // applyMove(col, false) đi trực tiếp (không bị chặn theo seat như onClick).
  // P1 dồn cột 0, P2 dồn cột 1 -> P1 thắng dọc 4
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false); liveApi.applyMove(1, false);
  liveApi.applyMove(0, false);

  assert.ok(moves.length >= 7, "phải ghi lại các nước vào replay log");
  assert.strictEqual(live.scores[0], 1, "P1 thắng ở ván gốc");

  const sink = [];
  const replay = makeReplayCtx(opts, sink, 7);
  const replayApi = cfg.create(replay);
  moves.forEach((mv) => replayApi.applyMove(mv, true));

  assert.deepStrictEqual(sink, [], "phát lại không gửi lại nước");
  assert.strictEqual(replay.scores[0], 1, "phát lại tái hiện đúng P1 thắng");
});

function restoreOnline(id, options, steps, mySeat, seed = 7) {
  const ctx = makeCtx(options, seed);
  ctx.isOnline = true;
  ctx.mySeat = mySeat;
  ctx.fastForward = true;
  ctx.sendMove = () => {};
  const api = loadGame(id).create(ctx);
  for (const { seat, move } of steps) api.applyMove(move, seat !== mySeat);
  return { ctx, api };
}

test("replay: lựa chọn bí mật của cả hai ghế qua nhiều vòng", () => {
  const cases = [
    {
      id: "rpsplus", options: { rounds: 3 }, winner: 0,
      pair: [{ k: "pick", c: "R" }, { k: "pick", c: "S" }],
    },
    {
      id: "prisonersdilemma", options: { rounds: 3 }, winner: 0,
      pair: [{ k: "pick", c: "D" }, { k: "pick", c: "C" }],
    },
    {
      id: "numberduel", options: { target: 6 }, winner: 0,
      pair: [{ k: "pick", n: 2 }, { k: "pick", n: 1 }],
    },
  ];
  for (const { id, options, winner, pair } of cases) {
    const steps = Array.from({ length: 3 }, () => [
      { seat: 0, move: pair[0] }, { seat: 1, move: pair[1] },
    ]).flat();
    for (const mySeat of [0, 1]) {
      const { ctx, api } = restoreOnline(id, options, steps, mySeat);
      assert.strictEqual(ctx.scores[winner], 1, `${id}: ghế ${mySeat} dựng đủ ba vòng`);
      assert.match(ctx.status, /🎉/, `${id}: khôi phục đúng kết quả cuối`);
      api.destroy();
    }
  }
});

test("replay: Liar's Dice nhận nước vòng sau ngay sau challenge", () => {
  const steps = Array.from({ length: 3 }, () => [
    { seat: 0, move: { k: "bid", qty: 7, face: 6 } },
    { seat: 1, move: { k: "challenge" } },
  ]).flat();
  for (const mySeat of [0, 1]) {
    const { ctx, api } = restoreOnline("liarsdice", { dice: 3 }, steps, mySeat);
    assert.strictEqual(ctx.scores[1], 1, `ghế ${mySeat} dựng đủ ba vòng tố`);
    assert.match(ctx.status, /🎉/);
    api.destroy();
  }
});

test("replay: Blackjack nhận hành động của vòng mới sau lật bài", () => {
  const steps = [];
  const live = restoreOnline("blackjackduel", { wins: 2 }, [], 0, 7);
  for (let i = 0; i < 60 && live.ctx.scores[0] + live.ctx.scores[1] === 0; i++) {
    const seat = live.ctx.turn;
    assert.ok(seat === 0 || seat === 1, "còn người đang đi");
    const move = { k: "stand" };
    steps.push({ seat, move });
    live.api.applyMove(move, seat !== 0);
  }
  assert.ok(steps.length >= 4, "đã chơi nhiều hơn một vòng bài");
  assert.strictEqual(live.ctx.scores[0] + live.ctx.scores[1], 1, "ván gốc đã kết thúc");
  const restored = restoreOnline("blackjackduel", { wins: 2 }, steps, 1, 7);
  assert.deepStrictEqual(restored.ctx.scores, live.ctx.scores, "hai ghế cùng kết quả");
  assert.strictEqual(restored.ctx.status, live.ctx.status);
  live.api.destroy(); restored.api.destroy();
});

test("replay: Reaction Duel dựng các vòng cũ và xử thua vòng phản xạ bị gián đoạn", () => {
  const steps = [
    { seat: 0, move: { k: "start" } },
    { seat: 0, move: { k: "rt", ms: 100 } },
    { seat: 1, move: { k: "rt", ms: 200 } },
    { seat: 1, move: { k: "start" } },
    { seat: 0, move: { k: "rt", ms: 120 } },
    { seat: 1, move: { k: "rt", ms: 200 } },
    { seat: 0, move: { k: "start" } },
  ];
  const { ctx, api } = restoreOnline("reactionduel", { rounds: 3 }, steps, 1);
  const emitted = [];
  ctx.sendMove = (move) => emitted.push(move);
  ctx.fastForward = false;
  api.finishHistoryReplay();
  assert.deepStrictEqual(emitted, [{ k: "foul" }]);
  assert.strictEqual(ctx.scores[0], 1, "vòng gián đoạn được xử và trận hoàn tất");
  assert.match(ctx.status, /🎉/);
  api.destroy();
});

test("online: nước đến sớm khi đang lật vòng được áp dụng ở vòng kế", async () => {
  const ctx = makeCtx({ rounds: 2 }, 7);
  ctx.isOnline = true;
  ctx.mySeat = 0;
  const api = loadGame("rpsplus").create(ctx);
  api.applyMove({ k: "pick", c: "R" }, false);
  api.applyMove({ k: "pick", c: "S" }, true);
  api.applyMove({ k: "pick", c: "S" }, true); // đối thủ đã sang vòng 2
  await sleep(1800);
  api.applyMove({ k: "pick", c: "R" }, false);
  await sleep(1800);
  assert.strictEqual(ctx.scores[0], 1, "không mất nước của đối thủ ở vòng 2");
  api.destroy();
});

test("replay: bỏ qua hiệu ứng lật thẻ, xoay bàn và gieo xúc xắc", () => {
  const rng = makeRng(7);
  const deck = ["🐶", "🐱", "🦊", "🐼", "🐯", "🦁", "🐸", "🐵"];
  deck.push(...deck);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const second = deck.findIndex((v) => v !== deck[0]);
  const memory = restoreOnline("memory", { pairs: 8 }, [
    { seat: 0, move: 0 }, { seat: 0, move: second }, { seat: 1, move: 1 },
  ], 0);
  assert.strictEqual(memory.ctx.turn, 1, "Memory đã lật úp cặp sai và cho P2 đi");
  memory.api.destroy();

  const pentago = restoreOnline("pentago", {}, [
    { seat: 0, move: { cell: 0, quad: 0, dir: "cw" } },
    { seat: 1, move: { cell: 35, quad: 3, dir: "ccw" } },
  ], 0);
  assert.strictEqual(pentago.ctx.turn, 0, "Pentago đã xử lý hai lượt xoay");
  pentago.api.destroy();

  const pig = restoreOnline("pig", { target: 100 }, [
    { seat: 0, move: { kind: "roll", die: 6 } },
    { seat: 0, move: { kind: "hold" } },
    { seat: 1, move: { kind: "roll", die: 4 } },
  ], 0);
  assert.strictEqual(pig.ctx.turn, 1, "Pig đã chuyển lượt sau khi giữ điểm");
  assert.strictEqual(pig.ctx.boardEl.children[0].querySelector("#pigTemp").textContent, "4");
  pig.api.destroy();

  const yahtzee = restoreOnline("yahtzee", {}, [
    { seat: 0, move: { kind: "roll", dice: [1, 1, 2, 3, 4] } },
    { seat: 0, move: { kind: "score", cat: "ones" } },
    { seat: 1, move: { kind: "roll", dice: [2, 2, 3, 4, 5] } },
  ], 0);
  assert.strictEqual(yahtzee.ctx.turn, 1, "Yahtzee đã xử lý lần gieo của P2");
  yahtzee.api.destroy();
});
