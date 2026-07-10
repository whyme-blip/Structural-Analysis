// src/utils/rng.js
// Small deterministic seeded RNG utilities used by fixtures and analysis.
// Implements a simple mulberry32 PRNG and a convenience createSeededRNG factory.

export function mulberry32(seed) {
  // Accepts string or number seed; produce deterministic 32-bit state
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return function() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRNG(seed = '1337') {
  const _seed = typeof seed === 'string' ? seed : String(seed);
  const r = mulberry32(_seed);
  return {
    random: () => r(),
    integer: (min, max) => Math.floor(r() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(r() * arr.length)]
  };
}
