// index.js (project root)
// Lightweight entry that exposes the main analysis functions for quick imports.
// This file intentionally minimal — prefer importing specific modules to keep bundle small.

export { computeBeta } from './src/analysis/betaEngine.js';
export { computeConfidence } from './src/analysis/confidenceEngine/confidenceEngine.js';
export { analyzeFabric } from './src/analysis/fabricClassifier.js';
export { createSeededRNG } from './src/utils/rng.js';
export { parseCSV } from './src/ingest/parser.js';
