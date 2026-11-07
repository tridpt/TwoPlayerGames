"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createVerifier } = require("../ranked-games");

test("ranked Tic-Tac-Toe checks turn order, legal moves and a real win", () => {
  const game = createVerifier("tictactoe", { mode: "classic" });
  assert.ok(game);
  assert.equal(game.apply({ k: "p", i: 0 }, 1), false);
  assert.equal(game.apply({ k: "p", i: 0 }, 0), true);
  assert.equal(game.apply({ k: "p", i: 0 }, 1), false);
  for (const [player, i] of [[1, 3], [0, 1], [1, 4], [0, 2]]) {
    assert.equal(game.apply({ k: "p", i }, player), true);
  }
  assert.equal(game.result, 0);
  assert.equal(game.apply({ k: "p", i: 8 }, 1), false);
});

test("ranked Tic-Tac-Toe recognizes both diagonal wins", () => {
  for (const [a, b, c] of [[0, 4, 8], [2, 4, 6]]) {
    const game = createVerifier("tictactoe", { mode: "classic" });
    for (const [player, i] of [[0, a], [1, 1], [0, b], [1, 3], [0, c]]) {
      assert.equal(game.apply({ k: "p", i }, player), true);
    }
    assert.equal(game.result, 0);
    assert.equal(game.apply({ k: "p", i: 7 }, 1), false);
  }
});

test("ranked Tic-Tac-Toe move mode validates adjacent slides", () => {
  const game = createVerifier("tictactoe", { mode: "move" });
  for (const [player, i] of [[0, 0], [1, 3], [0, 1], [1, 4], [0, 8], [1, 6]]) {
    assert.equal(game.apply({ k: "p", i }, player), true);
  }
  assert.equal(game.apply({ k: "p", i: 2 }, 0), false);
  assert.equal(game.apply({ k: "m", from: 8, to: 2 }, 0), false);
  assert.equal(game.apply({ k: "m", from: 1, to: 2 }, 0), true);
});

test("ranked Connect Four verifies a vertical win", () => {
  const game = createVerifier("connectfour", { cols: 7, rows: 6, need: 4 });
  assert.ok(game);
  assert.equal(game.apply(9, 0), false);
  for (const [player, col] of [[0, 0], [1, 1], [0, 0], [1, 1], [0, 0], [1, 1], [0, 0]]) {
    assert.equal(game.apply(col, player), true);
  }
  assert.equal(game.result, 0);
  assert.equal(game.apply(2, 1), false);
});

test("unsupported games and options cannot enter ranked play", () => {
  assert.equal(createVerifier("gomoku"), null);
  assert.equal(createVerifier("tictactoe", { mode: "unknown" }), null);
  assert.equal(createVerifier("connectfour", { cols: 100 }), null);
});
