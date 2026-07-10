/**
 * Complete deterministic random number generator utility.
 * Satisfies structural baseline requirements and fabric classifier seeding.
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

// --- Added Isolated Factory Function for Fabric Classification ---
export function createSeededRNG(initialSeed = 1337) {
    let localSeed = Number(initialSeed) || 1337;
    const generator = () => {
        localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
        return localSeed / 4294967296;
    };
    return {
        random: generator,
        next: generator
    };
}

const rng = {
    seed,
    random,
    next,
    createSeededRNG
};

export default rng;
