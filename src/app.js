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

// Shrink each cell's text until it fits inside the square. The CSS sets a base
// size from the card's width and the user's font size (see .cell in style.css);
// this only finds how much of it to keep, as the unitless factor --fit (1 = no
// shrinking). Storing a factor, not pixels, lets the text keep scaling with the
// card between refits. The label is measured (not the button) because centred
// overflow in a flex box is clipped on both sides and would not show up in
// scrollHeight.
const MIN_PX = 8; // never shrink text below this, whatever the font size
function fitText() {
  for (const b of $card.children) {
    const label = b.firstElementChild;
    const room = b.clientHeight - 4; // 2px padding top and bottom
    if (room <= 0) continue; // not laid out yet
    const fits = (factor) => {
      b.style.setProperty("--fit", factor);
      return label.offsetHeight <= room && label.scrollWidth <= label.clientWidth;
    };
    if (fits(1)) continue;
    const base = parseFloat(getComputedStyle(b).fontSize); // size at --fit: 1
    let lo = Math.min(1, MIN_PX / base);
    let hi = 1;
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid; else hi = mid;
    }
    b.style.setProperty("--fit", lo);
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

// Asks a yes/no question in the native <dialog>. Resolves true only when the
// OK button was used; Cancel, Esc, the back gesture and a tap outside resolve
// false. The browser handles focus, the inert page and focus return.
const $dialog = document.getElementById("confirm");
function ask({ title, text, ok }) {
  if (typeof $dialog.showModal !== "function") return Promise.resolve(confirm(`${title} ${text}`));
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-ok").textContent = ok;
  $dialog.returnValue = "";
  return new Promise((resolve) => {
    $dialog.addEventListener("close", () => {
      const accepted = $dialog.returnValue === "ok";
      $dialog.returnValue = ""; // a dismissal sets no value; do not leak this one
      resolve(accepted);
    }, { once: true });
    $dialog.showModal();
  });
}

document.getElementById("new-card").addEventListener("click", async () => {
  if (isPristine() || await ask({
    title: "Replace this card?",
    text: "Your marks on it will be lost.",
    ok: "New card",
  })) {
    useSeed(newSeed());
  }
});

document.getElementById("clear").addEventListener("click", async () => {
  if (isPristine() || await ask({
    title: "Clear all marks?",
    text: "The card stays the same; only your marks are removed.",
    ok: "Clear marks",
  })) {
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
