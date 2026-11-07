"use strict";

// Only games whose full rules are checked here can affect the public rating.
// The browser remains responsible for rendering; this state is authoritative.
const LINES_3 = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function ticTacToe(options) {
  const mode = options.mode || "classic";
  if (mode !== "classic" && mode !== "move") return null;
  const board = Array(9).fill(null);
  const placed = [0, 0];
  let turn = 0;
  let phase = "place";
  let moveCount = 0;
  let result = null;

  function adjacent(a, b) {
    const ra = Math.floor(a / 3), rb = Math.floor(b / 3);
    return a !== b && Math.abs(ra - rb) <= 1 && Math.abs((a % 3) - (b % 3)) <= 1;
  }

  return {
    apply(move, player) {
      if (result !== null || player !== turn || !move || typeof move !== "object" || Array.isArray(move)) return false;
      if (move.k === "p" && phase === "place") {
        if (!Number.isInteger(move.i) || move.i < 0 || move.i >= 9 || board[move.i] !== null) return false;
        board[move.i] = turn;
        placed[turn]++;
      } else if (move.k === "m" && mode === "move" && phase === "move") {
        if (!Number.isInteger(move.from) || !Number.isInteger(move.to) ||
            move.from < 0 || move.from >= 9 || move.to < 0 || move.to >= 9 ||
            board[move.from] !== turn || board[move.to] !== null || !adjacent(move.from, move.to)) return false;
        board[move.from] = null;
        board[move.to] = turn;
        moveCount++;
      } else return false;

      if (mode === "move" && phase === "place" && placed[0] >= 3 && placed[1] >= 3) phase = "move";
      if (LINES_3.some((line) => line.every((i) => board[i] === turn))) result = turn;
      else if (mode === "classic" && board.every((v) => v !== null)) result = "draw";
      else if (mode === "move" && phase === "move" && moveCount >= 30) result = "draw";
      if (result === null) turn = 1 - turn;
      return true;
    },
    get result() { return result; },
  };
}

function connectFour(options) {
  const cols = options.cols || 7;
  const rows = options.rows || 6;
  const need = options.need || 4;
  if (![5, 7, 9].includes(cols) || ![5, 6, 8].includes(rows) || ![3, 4, 5].includes(need)) return null;
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  let turn = 0;
  let result = null;

  function inBounds(r, c) { return r >= 0 && r < rows && c >= 0 && c < cols; }
  function count(r, c, dr, dc) {
    let n = 0;
    for (let rr = r + dr, cc = c + dc; inBounds(rr, cc) && board[rr][cc] === turn; rr += dr, cc += dc) n++;
    return n;
  }

  return {
    apply(move, player) {
      if (result !== null || player !== turn || !Number.isInteger(move) || move < 0 || move >= cols) return false;
      let row = rows - 1;
      while (row >= 0 && board[row][move] !== null) row--;
      if (row < 0) return false;
      board[row][move] = turn;
      if ([[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) =>
        1 + count(row, move, dr, dc) + count(row, move, -dr, -dc) >= need)) result = turn;
      else if (board[0].every((v) => v !== null)) result = "draw";
      if (result === null) turn = 1 - turn;
      return true;
    },
    get result() { return result; },
  };
}

function createVerifier(gameId, options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  if (gameId === "tictactoe") return ticTacToe(options);
  if (gameId === "connectfour") return connectFour(options);
  return null;
}

module.exports = { createVerifier };
