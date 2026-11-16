import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_INDEX,
  FREE_LABEL,
  LINES,
  SIZE,
  completedLines,
  freshMarks,
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

test("rejects a list with fewer than 24 different squares", () => {
  assert.throws(() => makeCard("x", SQUARES.slice(0, 23)));
  const padded = [...Array(23).fill("a").map((_, i) => `s${i}`), "s0", "s0", "s0"];
  assert.throws(() => makeCard("x", padded)); // 26 entries but only 23 distinct
});

test("the real square list has enough different squares", () => {
  assert.ok(new Set(SQUARES).size >= 24);
});

test("a repeated square never appears twice on one card", () => {
  const list = [...Array.from({ length: 30 }, (_, i) => `s${i}`), "s0", "s0"];
  for (let i = 0; i < 100; i++) {
    const card = makeCard(`dup${i}`, list);
    assert.equal(new Set(card).size, 25);
  }
});

test("a repeated square lands on more cards than a single one", () => {
  const list = [...Array.from({ length: 30 }, (_, i) => `s${i}`), "s0"];
  let doubled = 0;
  let single = 0;
  for (let i = 0; i < 400; i++) {
    const card = makeCard(`w${i}`, list);
    if (card.includes("s0")) doubled++;
    if (card.includes("s1")) single++;
  }
  assert.ok(doubled > single + 20, `doubled=${doubled} single=${single}`);
});

test("there are 12 lines, each of 5 cells", () => {
  assert.equal(LINES.length, 12);
  assert.ok(LINES.every((l) => l.length === 5));
});

test("a fresh card has only the free square on, and that completes nothing", () => {
  assert.deepEqual([...freshMarks()], [FREE_INDEX]);
  assert.deepEqual(completedLines(freshMarks()), []);
  assert.deepEqual(completedLines([]), []);
});

test("freshMarks returns a new set each time", () => {
  const a = freshMarks();
  a.add(0);
  assert.equal(freshMarks().size, 1);
});

test("detects rows, columns and both diagonals", () => {
  assert.equal(completedLines([0, 1, 2, 3, 4]).length, 1); // top row
  assert.equal(completedLines([2, 7, 12, 17, 22]).length, 1); // middle column via free
  assert.equal(completedLines([0, 6, 12, 18, 24]).length, 1); // main diagonal via free
  assert.equal(completedLines([4, 8, 12, 16, 20]).length, 1); // anti-diagonal via free
});

test("switching the free square off breaks the lines through the centre", () => {
  const withFree = [...freshMarks(), 2, 7, 17, 22];
  assert.equal(completedLines(withFree).length, 1);
  const withoutFree = withFree.filter((i) => i !== FREE_INDEX);
  assert.equal(completedLines(withoutFree).length, 0);
  // Lines that do not touch the centre are unaffected.
  assert.equal(completedLines([0, 1, 2, 3, 4]).length, 1);
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
  assert.equal(seen.size, new Set(SQUARES).size + 1); // every square + the free one
});
