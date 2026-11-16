import { FREE_INDEX, completedLines, freshMarks, makeCard, newSeed } from "./bingo.js";
import { SQUARES } from "./squares.js";

const KEY_LAST = "ccbingo:lastSeed";
const keyMarks = (seed) => `ccbingo:marks:${seed}`;
// The free square is on by default, so only "off" needs remembering. A separate
// key keeps marks saved by earlier versions of the page valid.
const keyFreeOff = (seed) => `ccbingo:freeOff:${seed}`;

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
let marked; // Set of cell indices; the free square is in it while it is "on"
let lineCount = 0;

function seedFromUrl() {
  const m = location.hash.match(/^#card=([0-9a-z]{4,16})$/);
  return m ? m[1] : null;
}

function loadMarks(s) {
  let set;
  try {
    const saved = JSON.parse(load(keyMarks(s)) ?? "[]");
    set = new Set(saved.filter((i) => Number.isInteger(i) && i >= 0 && i < 25 && i !== FREE_INDEX));
  } catch {
    set = new Set();
  }
  if (load(keyFreeOff(s)) !== "1") set.add(FREE_INDEX);
  return set;
}

function saveMarks() {
  save(keyMarks(seed), JSON.stringify([...marked].filter((i) => i !== FREE_INDEX)));
  save(keyFreeOff(seed), marked.has(FREE_INDEX) ? "0" : "1");
}

// True while the player has not changed anything on this card, so there is
// nothing to lose by replacing or clearing it.
function isPristine() {
  return marked.size === 1 && marked.has(FREE_INDEX);
}

function useSeed(s) {
  seed = s;
  card = makeCard(seed, SQUARES);
  save(KEY_LAST, seed);
  history.replaceState(null, "", `#card=${seed}`);
  marked = loadMarks(seed);
  lineCount = completedLines(marked).length;
  build();
  announce(false);
}

// Builds the 25 buttons. This only happens for a new card: tapping a square
// updates its button in place (see refresh), because replacing the buttons
// would drop keyboard and screen-reader focus on every tap.
function build() {
  $card.replaceChildren();
  card.forEach((text, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = i === FREE_INDEX ? "cell free" : "cell";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = text;
    b.append(label);
    b.addEventListener("click", () => toggle(i));
    $card.append(b);
  });
  refresh();
  fitText();
}

// Brings every button in line with `marked` without recreating anything.
function refresh() {
  const wins = new Set(completedLines(marked).flat());
  [...$card.children].forEach((b, i) => {
    b.setAttribute("aria-pressed", String(marked.has(i)));
    b.classList.toggle("win", wins.has(i));
  });
}

// Shrink each cell's text to the largest size that fits inside the square.
// The label is measured (not the button) because centred overflow in a flex
// box is clipped on both sides and would not show up in scrollHeight.
const MIN_PX = 8;
function fitText() {
  for (const b of $card.children) {
    const label = b.firstElementChild;
    const room = b.clientHeight - 4; // 2px padding top and bottom
    if (room <= 0) continue; // not laid out yet
    let lo = MIN_PX;
    let hi = Math.min(16, b.clientWidth * 0.2);
    const fits = (px) => {
      b.style.fontSize = `${px}px`;
      return label.offsetHeight <= room && label.scrollWidth <= label.clientWidth;
    };
    if (fits(hi)) continue;
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid; else hi = mid;
    }
    b.style.fontSize = `${lo}px`;
  }
}

let fitQueued = false;
new ResizeObserver(() => {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fitText(); });
}).observe($card);

function toggle(i) {
  if (marked.has(i)) marked.delete(i); else marked.add(i);
  saveMarks();
  const before = lineCount;
  lineCount = completedLines(marked).length;
  refresh();
  announce(lineCount > before);
}

function announce(justWon) {
  if (lineCount === 0) $status.textContent = " ";
  else if (justWon) $status.textContent = lineCount === 1 ? "BINGO!" : `BINGO! (${lineCount} lines)`;
  else $status.textContent = lineCount === 1 ? "1 line complete" : `${lineCount} lines complete`;
  if (justWon && navigator.vibrate) navigator.vibrate(150);
}

document.getElementById("new-card").addEventListener("click", () => {
  if (isPristine() || confirm("Replace this card with a new one? Your marks on it will be lost.")) {
    useSeed(newSeed());
  }
});

document.getElementById("clear").addEventListener("click", () => {
  if (isPristine() || confirm("Clear all marks on this card?")) {
    marked = freshMarks();
    saveMarks();
    lineCount = 0;
    refresh();
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
