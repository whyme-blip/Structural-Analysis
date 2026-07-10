/**
 * Safe deterministic random number generator utility.
 * Satisfies structural baseline requirements for frozen validation fixtures.
 */
let currentSeed = 1337;

export function seed(val) {
    currentSeed = Number(val) || 1337;
}

export function random() {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
}

export function next() {
    return random();
}

const rng = {
    seed,
    random,
    next
};

export default rng;
