// src/constants.js
// Centralized thresholds and presets for Structural-Analysis (frozen for v1.0.0)
export const SOFTWARE_VERSION = '1.0.0';
export const SOFTWARE_DEFAULT_SEED = '1337';

export const THRESHOLDS = Object.freeze({
  MIN_TENSOR: 3,
  MIN_FABRIC_PRELIM: 3,
  MIN_BETA: 5,
  MIN_BOOTSTRAP: 1000,
  BOOTSTRAP_PRESETS: Object.freeze({ QUICK: 1000, STANDARD: 5000, RESEARCH: 10000 }),
  MIN_TENSOR_STABILITY: 35,
  MAX_RMS_DEG: 12,
  MAX_BOOTSTRAP_CI_DEG: 15,
  CYLINDRICITY: Object.freeze({ POINT: 0.25, WEAK_GIRDLE: 0.45, GIRDLE: 0.70 }),
  MULTIMODAL: Object.freeze({ SEPARATION_DEG: 35, SECONDARY_PCT: 0.15 }),
  CONFIDENCE_CAP: 95,
  EVIDENCE: Object.freeze({ EXCELLENT: 5, GOOD: 10, FAIR: 15 })
});

export const CONFIDENCE_WEIGHTS = Object.freeze({
  FABRIC: 0.30,
  BETA: 0.30,
  EVIDENCE: 0.25,
  DATA_QUALITY: 0.15
});

export const CONFIDENCE_PENALTIES = Object.freeze({
  MISSING_ONE_MAJOR: 0.93,
  MISSING_BOTH_MAJOR: 0.86
});

export const GUARDRAILS = Object.freeze({
  MIN_SAMPLE_COUNT: 5,
  SAMPLE_COUNT_PENALTY_FACTOR: 0.90,
  EVIDENCE_CONFLICT_THRESHOLD: 50,
  EVIDENCE_CONFLICT_FACTOR: 0.90
});

export const CONFIDENCE_MAX_WITHHELD = 60;
export const BANNED_HIGH_CONFIDENCE_FABRICS = Object.freeze(['POINT', 'RANDOM', 'SCATTER', 'RANDOM/SCATTER', 'MULTIMODAL']);

export const CONFIDENCE_MESSAGES = Object.freeze({
  MISSING_BETA: "Beta result not present, reduced weight.",
  MISSING_EVIDENCE: "Field evidence missing, reduced weight.",
  CRIT_LOW_SAMPLE_COUNT: "Sample count below minimum structural requirements.",
  WARN_BETA_VARIANCE_HIGH: "Bootstrap orientation uncertainty is high.",
  WARN_EVIDENCE_CONFLICT: "Field observations show low structural agreement.",
  GUARDRAIL_BETA_WITHHELD: `Interpretation confidence capped at ${CONFIDENCE_MAX_WITHHELD}% because β-axis was not computed.`,
  GUARDRAIL_FABRIC_BANNED: (code) => `Interpretation confidence capped at ${CONFIDENCE_MAX_WITHHELD}% because fabric classification is ${code}.`
});

export const DATA_QUALITY_BANDS = Object.freeze({
  BOOTSTRAP: Object.freeze([
    { maxDeg: 5, score: 100 }, { maxDeg: 8, score: 95 }, { maxDeg: 10, score: 90 },
    { maxDeg: 12, score: 75 }, { maxDeg: 15, score: 60 }, { maxDeg: Infinity, score: 30 }
  ]),
  RMS: Object.freeze([
    { maxDeg: 4, score: 100 }, { maxDeg: 6, score: 95 }, { maxDeg: 8, score: 85 },
    { maxDeg: 10, score: 70 }, { maxDeg: 12, score: 55 }, { maxDeg: Infinity, score: 20 }
  ]),
  SAMPLE_SCORE_BANDS: Object.freeze([
    { min: 0, max: 4, score: 20 }, { min: 5, max: 7, score: 50 }, { min: 8, max: 12, score: 75 },
    { min: 13, max: 20, score: 90 }, { min: 21, max: Infinity, score: 100 }
  ])
});

export const CONFIDENCE_CLASSES = Object.freeze([
  { min: 90, name: 'Very High' }, { min: 80, name: 'High' }, { min: 65, name: 'Moderate' },
  { min: 50, name: 'Low' }, { min: 0, name: 'Very Low' }
]);

export const DEFAULT_PHASE_NAMES = Object.freeze(['F1', 'F2', 'F3', 'F4']);
