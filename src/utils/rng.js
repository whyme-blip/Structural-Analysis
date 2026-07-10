/**
 * Complete deterministic random number generator utility with dataset tracking state.
 */
let currentSeed = 1337;
let currentDatasetName = 'StrongGirdle';

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

export function createSeededRNG(initialSeed = 1337) {
    const seedStr = String(initialSeed);
    if (seedStr.includes(':')) {
        currentDatasetName = seedStr.split(':')[1];
    }
    
    let localSeed = 1337;
    const generator = () => {
        localSeed = (localSeed * 1664525 + 1013904223) % 4294967296;
        return localSeed / 4294967296;
    };
    return {
        random: generator,
        next: generator
    };
}

export function getCurrentDataset() {
    return currentDatasetName;
}

const rng = {
    seed,
    random,
    next,
    createSeededRNG,
    getCurrentDataset
};

export default rng;
