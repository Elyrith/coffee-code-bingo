import { FREE_INDEX, completedLines, makeCard, newSeed } from "./bingo.js";
import { SQUARES } from "./squares.js";

const KEY_LAST = "ccbingo:lastSeed";
const keyMarks = (seed) => `ccbingo:marks:${seed}`;

// localStorage can throw (private mode, blocked storage). The app still works
// without it; the card just isn't remembered.
function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

const $card = document.getElementById("card");
const $status = document.getElementById("status");

let seed;
let card;
let marked; // Set of cell indices (the free square is implied)
let lineCount = 0;

function seedFromUrl() {
  const m = location.hash.match(/^#card=([0-9a-z]{4,16})$/);
  return m ? m[1] : null;
}

function useSeed(s) {
  seed = s;
  card = makeCard(seed, SQUARES);
  save(KEY_LAST, seed);
  history.replaceState(null, "", `#card=${seed}`);
  try {
    const saved = JSON.parse(load(keyMarks(seed)) ?? "[]");
    marked = new Set(saved.filter((i) => Number.isInteger(i) && i >= 0 && i < 25));
  } catch {
    marked = new Set();
  }
  lineCount = completedLines(marked).length;
  render();
  announce(false);
}

function render() {
  $card.replaceChildren();
  const wins = new Set(completedLines(marked).flat());
  card.forEach((text, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.textContent = text;
    b.setAttribute("role", "gridcell");
    const isFree = i === FREE_INDEX;
    if (isFree) b.classList.add("free");
    const on = isFree || marked.has(i);
    b.setAttribute("aria-pressed", String(on));
    if (wins.has(i)) b.classList.add("win");
    if (!isFree) b.addEventListener("click", () => toggle(i));
    $card.append(b);
  });
}

function toggle(i) {
  if (marked.has(i)) marked.delete(i); else marked.add(i);
  save(keyMarks(seed), JSON.stringify([...marked]));
  const before = lineCount;
  lineCount = completedLines(marked).length;
  render();
  announce(lineCount > before);
}

function announce(justWon) {
  if (lineCount === 0) $status.textContent = " ";
  else if (justWon) $status.textContent = lineCount === 1 ? "BINGO!" : `BINGO! (${lineCount} lines)`;
  else $status.textContent = lineCount === 1 ? "1 line complete" : `${lineCount} lines complete`;
  if (justWon && navigator.vibrate) navigator.vibrate(150);
}

document.getElementById("new-card").addEventListener("click", () => {
  if (marked.size === 0 || confirm("Replace this card with a new one? Your marks on it will be lost.")) {
    useSeed(newSeed());
  }
});

document.getElementById("clear").addEventListener("click", () => {
  if (marked.size === 0 || confirm("Clear all marks on this card?")) {
    marked = new Set();
    save(keyMarks(seed), "[]");
    lineCount = 0;
    render();
    announce(false);
  }
});

document.getElementById("share").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(location.href);
    btn.textContent = "Copied!";
  } catch {
    btn.textContent = "Copy from address bar";
  }
  setTimeout(() => { btn.textContent = "Copy card link"; }, 2000);
});

window.addEventListener("hashchange", () => {
  const s = seedFromUrl();
  if (s && s !== seed) useSeed(s);
});

useSeed(seedFromUrl() ?? load(KEY_LAST) ?? newSeed());
