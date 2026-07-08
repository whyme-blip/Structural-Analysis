// src/analysis/fabricClassifier.js
// Structural Fabric Analysis Engine (Stage 3.3)
// Pure functions. Deterministic given a seeded RNG.

import { buildOrientationTensor, cylindricityIndex, tensorStabilityMetric } from '../core/tensor.js';
import { computeEigenSystem } from '../core/math.js';
import { fisherMeanDirection, woodcockIndices, bootstrapCI } from '../core/statistics.js';
import { createSeededRNG } from '../utils/rng.js';
import { THRESHOLDS } from '../constants.js';

// Fabric classification codes
const FABRIC_CODES = {
  POINT: 'POINT',
  WEAK_GIRDLE: 'WEAK_GIRDLE',
  GIRDLE: 'GIRDLE',
  STRONG_GIRDLE: 'STRONG_GIRDLE',
  MULTIMODAL: 'MULTIMODAL',
  SCATTER: 'SCATTER',
  RANDOM: 'RANDOM'
};

// Helper: compute simple angular RMS (deg) around a reference vector
function angularStatsAround(refVec, vectors) {
  if (!vectors || vectors.length === 0) return { mean: null, rms: null };
  const toDeg = (r) => r * 180 / Math.PI;
  const degs = vectors.map(v => {
    // dot -> angle
    const dp = Math.max(-1, Math.min(1, refVec[0]*v[0] + refVec[1]*v[1] + refVec[2]*v[2]));
    const ang = Math.acos(dp);
    return toDeg(ang);
  });
  const mean = degs.reduce((a,b)=>a+b,0)/degs.length;
  const sq = degs.map(d => (d-mean)*(d-mean));
  const rms = Math.sqrt(sq.reduce((a,b)=>a+b,0)/degs.length);
  return { mean, rms };
}

// Conservative multimodal detection: check for potential secondary cluster
function detectMultimodal(vectors) {
  if (!vectors || vectors.length < 6) return { multimodal: false, details: null };
  // simple approach: pick two seed vectors using max angular separation
  let maxSep = -1; let iMax=0, jMax=1;
  for (let i=0;i<vectors.length;i++){
    for (let j=i+1;j<vectors.length;j++){
      const dp = Math.max(-1, Math.min(1, vectors[i][0]*vectors[j][0] + vectors[i][1]*vectors[j][1] + vectors[i][2]*vectors[j][2]));
      const ang = Math.acos(dp) * 180 / Math.PI;
      if (ang > maxSep) { maxSep = ang; iMax = i; jMax = j; }
    }
  }
  if (maxSep < THRESHOLDS.MULTIMODAL.SEPARATION_DEG) return { multimodal: false, details: null };
  // cluster assignment by closer to seed iMax or jMax
  const seedA = vectors[iMax], seedB = vectors[jMax];
  let aCount=0, bCount=0;
  for (const v of vectors) {
    const dpA = Math.max(-1, Math.min(1, seedA[0]*v[0] + seedA[1]*v[1] + seedA[2]*v[2]));
    const dpB = Math.max(-1, Math.min(1, seedB[0]*v[0] + seedB[1]*v[1] + seedB[2]*v[2]));
    const angA = Math.acos(dpA) * 180 / Math.PI;
    const angB = Math.acos(dpB) * 180 / Math.PI;
    if (angA < angB) aCount++; else bCount++;
  }
  const total = vectors.length;
  const secondaryPct = Math.min(aCount,bCount)/total;
  const details = { separation: maxSep, primary: Math.max(aCount,bCount), secondary: Math.min(aCount,bCount), secondaryPct };
  const multimodal = (maxSep > THRESHOLDS.MULTIMODAL.SEPARATION_DEG) && (secondaryPct >= THRESHOLDS.MULTIMODAL.SECONDARY_PCT);
  return { multimodal, details };
}

// Normalize eigenvalues to sum=1 if not already
function normalizeEigenValues(rawValues) {
  const sum = rawValues.reduce((a,b)=>a+b,0) || 1;
  return rawValues.map(v => v / sum);
}

// Map CI to fabric code
function classifyByCylindricity(ci) {
  if (ci === null || ci === undefined || isNaN(ci)) return FABRIC_CODES.SCATTER;
  if (ci < THRESHOLDS.CYLINDRICITY.POINT) return FABRIC_CODES.POINT;
  if (ci < THRESHOLDS.CYLINDRICITY.WEAK_GIRDLE) return FABRIC_CODES.WEAK_GIRDLE;
  if (ci < THRESHOLDS.CYLINDRICITY.GIRDLE) return FABRIC_CODES.GIRDLE;
  return FABRIC_CODES.STRONG_GIRDLE;
}

// Quality label from percentage
function qualityLabelFromPct(pct) {
  if (pct >= 90) return 'Excellent';
  if (pct >= 70) return 'High';
  if (pct >= 50) return 'Moderate';
  if (pct >= 30) return 'Low';
  return 'Poor';
}

// Fabric confidence scoring combining multiple metrics (0..100)
function computeFabricConfidence({ n, stability, bootstrapWidthDeg, eigenSep, fisherK }){
  // weights (tunable): sampleSize 25%, stability 25%, bootstrap 20%, eigenSep 15%, fisher 15%
  // normalize: sample size saturates at 30
  const w = { sample: 0.25, stability: 0.25, bootstrap: 0.20, eigenSep: 0.15, fisher: 0.15 };
  const sampleScore = Math.min(n, 30)/30; // 0..1
  const stabilityScore = Math.min(stability, 100)/100; // cap
  const bootstrapScore = 1 - Math.min(Math.abs(bootstrapWidthDeg)/180, 1); // smaller width => better
  const eigenScore = Math.min(eigenSep/1.0, 1); // eigenSep in normalized units ~ up to 1. use as-is
  const fisherScore = Math.min(Math.abs(fisherK)/50, 1); // arbitrary scaling
  const raw = sampleScore*w.sample + stabilityScore*w.stability + bootstrapScore*w.bootstrap + eigenScore*w.eigenSep + fisherScore*w.fisher;
  const pct = Math.round(Math.min(1, raw) * 100);
  return pct;
}

// Main API: analyzeFabric(vectors, options)
// vectors: array of unit 3D vectors (planar poles)
// options: { seed, bootstrapIterations }
function analyzeFabric(vectors, options = {}){
  const warnings = [];
  const errors = [];
  if (!Array.isArray(vectors)) {
    errors.push({ code: 'invalid_input', message: 'vectors must be an array' });
    return { success: false, warnings, errors, data: null };
  }

  const n = vectors.length;
  const seed = options.seed || '1337';
  const rng = createSeededRNG(seed);
  const iterations = Math.max(THRESHOLDS.MIN_BOOTSTRAP, options.bootstrapIterations || THRESHOLDS.BOOTSTRAP_PRESETS.QUICK);

  if (n < THRESHOLDS.MIN_TENSOR) {
    warnings.push({ code: 'insufficient_vectors', message: `N=${n} < MIN_TENSOR=${THRESHOLDS.MIN_TENSOR}; tensor not computed.` });
    const data = { tensor: null, eigen: null, woodcock: null, fisher: null, cylindricity: null, fabricClass: FABRIC_CODES.SCATTER, rationale: ['Insufficient data'], quality: 'Poor', suitableForBeta: false, fabricCode: FABRIC_CODES.SCATTER, fabricConfidence: 0 };
    return { success: true, warnings, errors, data };
  }

  // Orientation tensor
  const tensor = buildOrientationTensor(vectors);
  // Eigen
  const eig = computeEigenSystem(tensor); // { rawValues, values, vectors }
  const normalized = eig.values; // already normalized by computeEigenSystem

  // Woodcock
  const wood = woodcockIndices ? woodcockIndices(normalized) : woodecockFallback(normalized);
  // Fisher
  const fisher = fisherMeanDirection(vectors);
  // Cylindricity
  const ci = cylindricityIndex ? cylindricityIndex(normalized) : ( (normalized[1]-normalized[2]) / ((normalized[0]-normalized[2]) || 1e-12) );

  // Tensor stability
  const stability = tensorStabilityMetric ? tensorStabilityMetric(eig.rawValues) : 0;

  // Bootstrap on a scalar metric: here we compute angular dispersion of eigenvectors? Simpler: bootstrap angular CI on mean pole trend/plunge
  let bootstrapRes = null;
  try {
    const statFn = (sample) => {
      const f = fisherMeanDirection(sample);
      return f ? f.k : 0; // use fisher k as scalar surrogate
    };
    bootstrapRes = bootstrapCI(vectors, statFn, iterations, rng);
  } catch (e) {
    warnings.push({ code: 'bootstrap_failed', message: String(e) });
  }

  // Estimate bootstrap width in angular degrees: use fisher k ci surrogate -> we will estimate angular CI using fisher alpha95 if fisher available
  const bootstrapWidthDeg = (bootstrapRes && bootstrapRes.hi !== undefined && bootstrapRes.lo !== undefined) ? Math.abs(bootstrapRes.hi - bootstrapRes.lo) : null;

  // Eigen separation metric
  const eigenSep = normalized[0] - normalized[1];

  // Compute fabric code by CI
  const fabricByCI = classifyByCylindricity(ci);

  // Multimodal detection (conservative)
  const multi = detectMultimodal(vectors);
  if (multi.multimodal) {
    // override classification
    warnings.push({ code: 'multimodal_detected', message: `Multimodal candidate (sep=${multi.details.separation.toFixed(1)}°, secondary=${(multi.details.secondaryPct*100).toFixed(1)}%)` });
  }

  // Random/scatter detection: if eigenvalues nearly equal
  const maxMin = Math.max(...normalized) - Math.min(...normalized);
  const isRandom = maxMin < 0.12; // heuristic

  let finalFabric = FABRIC_CODES.SCATTER;
  if (multi.multimodal) finalFabric = FABRIC_CODES.MULTIMODAL;
  else if (isRandom) finalFabric = FABRIC_CODES.RANDOM;
  else finalFabric = fabricByCI;

  // Determine rationale reasons
  const rationale = [];
  rationale.push(`N=${n}`);
  rationale.push(`CI=${ci !== null ? ci.toFixed(3) : 'NA'}`);
  rationale.push(`EigenValues=${eig.values.map(v=>v.toFixed(3)).join(',')}`);
  rationale.push(`Stability=${stability !== null ? stability.toFixed(2) : 'NA'}`);
  if (bootstrapWidthDeg !== null) rationale.push(`BootstrapWidth=${bootstrapWidthDeg.toFixed(3)}`);
  if (finalFabric === FABRIC_CODES.POINT) rationale.push('λ1 dominates λ2 and λ3; low pole dispersion');
  if (finalFabric === FABRIC_CODES.WEAK_GIRDLE) rationale.push('Moderate cylindricity; possible girdle development');
  if (finalFabric === FABRIC_CODES.GIRDLE || finalFabric === FABRIC_CODES.STRONG_GIRDLE) rationale.push('Cylindrical distribution indicated by CI');
  if (finalFabric === FABRIC_CODES.RANDOM) rationale.push('Eigenvalues similar; no preferred orientation');
  if (finalFabric === FABRIC_CODES.MULTIMODAL) rationale.push('Multiple modes detected; mixture of distinct clusters');

  // Fabric confidence
  const fabricConfidence = computeFabricConfidence({ n, stability: stability || 0, bootstrapWidthDeg: bootstrapWidthDeg || 180, eigenSep: eigenSep, fisherK: fisher ? fisher.k : 0 });
  const quality = qualityLabelFromPct(fabricConfidence);

  // suitableForBeta: boolean only; apply gating here but DO NOT compute beta
  const suitableForBeta = (n >= THRESHOLDS.MIN_BETA) && (finalFabric !== FABRIC_CODES.POINT) && (finalFabric !== FABRIC_CODES.RANDOM) && (finalFabric !== FABRIC_CODES.MULTIMODAL) && (stability >= THRESHOLDS.MIN_TENSOR_STABILITY) && ( (bootstrapWidthDeg === null) ? false : (bootstrapWidthDeg < THRESHOLDS.MAX_BOOTSTRAP_CI_DEG) );

  const data = {
    tensor,
    eigen: eig,
    woodcock: wood,
    fisher,
    cylindricity: ci,
    fabricClass: finalFabric === FABRIC_CODES.SCATTER ? 'SCATTER' : finalFabric,
    fabricCode: finalFabric,
    rationale,
    quality,
    fabricConfidence,
    suitableForBeta
  };

  return { success: true, warnings, errors, data };
}

export { analyzeFabric, FABRIC_CODES };
