import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_INDEX,
  FREE_LABEL,
  LINES,
  SIZE,
  completedLines,
  makeCard,
  newSeed,
} from "../src/bingo.js";
import { SQUARES } from "../src/squares.js";

test("same seed gives the same card", () => {
  assert.deepEqual(makeCard("abc", SQUARES), makeCard("abc", SQUARES));
});

test("different seeds give different cards", () => {
  assert.notDeepEqual(makeCard("abc", SQUARES), makeCard("abd", SQUARES));
});

test("card is 25 unique cells with the free square in the centre", () => {
  const card = makeCard("seed-1", SQUARES);
  assert.equal(card.length, SIZE * SIZE);
  assert.equal(card[FREE_INDEX], FREE_LABEL);
  assert.equal(new Set(card).size, 25);
  for (const cell of card) {
    assert.ok(cell === FREE_LABEL || SQUARES.includes(cell));
  }
});

test("rejects a list that is too short", () => {
  assert.throws(() => makeCard("x", SQUARES.slice(0, 23)));
});

test("square list has no duplicates", () => {
  assert.equal(new Set(SQUARES).size, SQUARES.length);
});

test("there are 12 lines, each of 5 cells", () => {
  assert.equal(LINES.length, 12);
  assert.ok(LINES.every((l) => l.length === 5));
});

test("free square alone completes nothing", () => {
  assert.deepEqual(completedLines([]), []);
});

test("detects rows, columns and both diagonals", () => {
  assert.equal(completedLines([0, 1, 2, 3, 4]).length, 1); // top row
  assert.equal(completedLines([2, 7, 17, 22]).length, 1); // middle column via free
  assert.equal(completedLines([0, 6, 18, 24]).length, 1); // main diagonal via free
  assert.equal(completedLines([4, 8, 16, 20]).length, 1); // anti-diagonal via free
});

test("four in a row is not a bingo", () => {
  assert.equal(completedLines([0, 1, 2, 3]).length, 0);
});

test("newSeed is a short, mostly-unique string", () => {
  const seeds = new Set(Array.from({ length: 200 }, newSeed));
  assert.ok(seeds.size > 195);
  for (const s of seeds) assert.match(s, /^[0-9a-z]{1,8}$/);
});

test("card distribution is not stuck on the first squares", () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) makeCard(`s${i}`, SQUARES).forEach((c) => seen.add(c));
  assert.equal(seen.size, SQUARES.length + 1); // every square + the free one
});
