// Pure card logic: no DOM, so it can be unit-tested with `node --test`.

export const SIZE = 5;
export const FREE_INDEX = 12; // centre of a 5x5 grid
export const FREE_LABEL = "FREE: Coffee & Code";

// FNV-1a: turns any seed string into a 32-bit integer.
export function hashSeed(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: small, fast seeded PRNG returning floats in [0, 1).
export function makeRng(seed) {
  let a = hashSeed(seed);
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return (bytes[0].toString(36) + bytes[1].toString(36)).slice(0, 8);
}

// Same seed + same square list => same card, every time.
export function makeCard(seed, squares) {
  const needed = SIZE * SIZE - 1;
  if (squares.length < needed) {
    throw new Error(`Need at least ${needed} squares, got ${squares.length}`);
  }
  const rng = makeRng(seed);
  const pool = squares.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, needed);
  picked.splice(FREE_INDEX, 0, FREE_LABEL);
  return picked;
}

// All 12 winning lines as arrays of cell indices.
export const LINES = (() => {
  const lines = [];
  for (let r = 0; r < SIZE; r++) {
    lines.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  }
  for (let c = 0; c < SIZE; c++) {
    lines.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  }
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + i));
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)));
  return lines;
})();

// `marked` is any iterable of cell indices. The free square always counts.
export function completedLines(marked) {
  const set = new Set(marked);
  set.add(FREE_INDEX);
  return LINES.filter((line) => line.every((i) => set.has(i)));
}
