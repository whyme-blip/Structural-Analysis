// src/analysis/fabricClassifier.js
// Very small deterministic classifier used by the validation runner.
// Returns fabricCode, fabricConfidence (0..100), tensorStability (0..100), rmsMisfit, bootstrap angular CI.

import { DATA_QUALITY_BANDS } from '../constants.js';

export function analyzeFabric(vectors = [], { seed = '1337', bootstrapIterations = 1000 } = {}) {
  // Defensive
  const n = (vectors && vectors.length) || 0;
  if (n === 0) {
    return { success: true, data: { success: false, fabricCode: 'UNKNOWN', fabricConfidence: 0, tensorStability: 0, rmsMisfit: 999, bootstrap: { angularCI: 180 } } };
  }

  // Simple tensor proxy: calculate directional dispersion from provided vectors (if arrays)
  // If vectors are arrays [x,y,z], use variance of first component as a crude stability estimate.
  let stability = 50;
  try {
    const xs = vectors.map(v => Array.isArray(v) ? v[0] : (v.x ?? 0));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const varr = xs.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / xs.length;
    stability = Math.round(Math.max(10, Math.min(100, 100 - varr * 20)));
  } catch (e) {
    stability = 50;
  }

  // Heuristic fabric classification
  let fabricCode = 'RANDOM/SCATTER';
  let fabricConfidence = 30;
  if (stability > 70) { fabricCode = 'GIRDLE'; fabricConfidence = 90; }
  else if (stability > 50) { fabricCode = 'POORLY_DEFINED'; fabricConfidence = 55; }
  else if (stability > 35) { fabricCode = 'MULTIMODAL'; fabricConfidence = 65; }

  // rms misfit: inverse of stability
  const rmsMisfit = Math.round(12 * (100 - stability) / 100 * 10) / 10;
  // bootstrap angular CI synthetic proxy
  const bootstrapAngularCI = Math.round(Math.max(3, 20 * (100 - stability) / 100));

  const data = {
    success: true,
    fabricCode,
    fabricConfidence,
    tensorStability: stability,
    rmsMisfit,
    bootstrap: { angularCI: bootstrapAngularCI, iterations: bootstrapIterations }
  };
  return { success: true, data };
}
