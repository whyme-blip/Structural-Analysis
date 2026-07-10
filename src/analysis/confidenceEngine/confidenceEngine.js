// src/analysis/confidenceEngine/confidenceEngine.js
// Orchestrator that consumes phase.results.fabric, phase.results.beta, phase.results.evidence
// and produces a deterministic interpretation confidence payload.
// Exports computeConfidence(phase) -> { success:true, data: { score, rating, ... } }

import { THRESHOLDS, CONFIDENCE_WEIGHTS, CONFIDENCE_PENALTIES, GUARDRAILS, DATA_QUALITY_BANDS, CONFIDENCE_CLASSES, CONFIDENCE_MAX_WITHHELD, BANNED_HIGH_CONFIDENCE_FABRICS, CONFIDENCE_MESSAGES } from '../../constants.js';

// Helpers
function clamp(v, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, v)); }
function lookupBand(bands, value) {
  if (value === null || value === undefined) return null;
  for (const b of bands) {
    if ((b.maxDeg === undefined || value <= b.maxDeg) && (b.min === undefined || value >= b.min)) return b.score;
  }
  return null;
}
function sampleScoreFromN(n) {
  for (const b of DATA_QUALITY_BANDS.SAMPLE_SCORE_BANDS) {
    if (n >= b.min && n <= b.max) return b.score;
  }
  return 20;
}
function findConfidenceClass(score) {
  for (const c of CONFIDENCE_CLASSES) if (score >= c.min) return c.name;
  return 'Very Low';
}

function computeDataQuality({ tensorStability, bootstrapAngularCI, rms, sampleCount }) {
  const stabilityScore = clamp(tensorStability ?? 0);
  const bootstrapScore = lookupBand(DATA_QUALITY_BANDS.BOOTSTRAP, bootstrapAngularCI) ?? 60;
  const rmsScore = lookupBand(DATA_QUALITY_BANDS.RMS, rms) ?? 70;
  const sScore = sampleScoreFromN(sampleCount || 0);
  const combined = Math.round(0.4 * stabilityScore + 0.3 * bootstrapScore + 0.2 * rmsScore + 0.1 * sScore);
  return { stabilityScore, bootstrapScore, rmsScore, sampleScore: sScore, combined };
}

export function computeConfidence(phase, options = {}) {
  const warnings = [];
  const errors = [];
  if (!phase || typeof phase !== 'object') { errors.push({ code: 'invalid_phase', message: 'Phase object required' }); return { success:false, warnings, errors, data:null }; }

  const fabric = phase.results?.fabric ?? null;
  const beta = phase.results?.beta ?? null;
  const evidence = phase.results?.evidence ?? null;

  // Component scores
  const S_fabric = (fabric && typeof fabric.fabricConfidence === 'number') ? clamp(fabric.fabricConfidence) : null;
  const S_beta = (beta && beta.calculated && typeof beta.confidence === 'number') ? Math.round(Math.min(100, (beta.confidence * 100) / THRESHOLDS.CONFIDENCE_CAP)) : null;
  const S_evidence = (evidence && typeof evidence.overallScore === 'number') ? clamp(evidence.overallScore) : null;

  const sampleCount = fabric?.sampleCount ?? (phase.planarRecords?.length ?? 0);
  const tensorStability = fabric?.tensorStability ?? null;
  const bootstrapAngularCI = fabric?.bootstrap?.angularCI ?? beta?.bootstrap?.angularCI ?? null;
  const rms = fabric?.rmsMisfit ?? beta?.rms ?? null;

  const dq = computeDataQuality({ tensorStability, bootstrapAngularCI, rms, sampleCount });

  // Presence flags & weights normalization
  const P_f = S_fabric !== null;
  const P_b = S_beta !== null;
  const P_e = S_evidence !== null;
  const W = Object.assign({}, CONFIDENCE_WEIGHTS);
  W.DATA_QUALITY = W.DATA_QUALITY ?? 0.15;
  const presentWeightSum = (P_f ? W.FABRIC : 0) + (P_b ? W.BETA : 0) + (P_e ? W.EVIDENCE : 0) + W.DATA_QUALITY;
  const Wp = {
    FABRIC: P_f ? W.FABRIC / presentWeightSum : 0,
    BETA: P_b ? W.BETA / presentWeightSum : 0,
    EVIDENCE: P_e ? W.EVIDENCE / presentWeightSum : 0,
    DATA_QUALITY: W.DATA_QUALITY / presentWeightSum
  };

  const contribFabric = (S_fabric || 0) * Wp.FABRIC;
  const contribBeta = (S_beta || 0) * Wp.BETA;
  const contribEvidence = (S_evidence || 0) * Wp.EVIDENCE;
  const contribDQ = (dq.combined || 0) * Wp.DATA_QUALITY;
  let combined_raw = contribFabric + contribBeta + contribEvidence + contribDQ;

  // Penalties for missing major components
  let penaltyMultiplier = 1.0;
  if (!P_b && !P_e) penaltyMultiplier = CONFIDENCE_PENALTIES.MISSING_BOTH_MAJOR;
  else if (!P_b || !P_e) penaltyMultiplier = CONFIDENCE_PENALTIES.MISSING_ONE_MAJOR;
  combined_raw = combined_raw * penaltyMultiplier;

  const rationale = [];
  if (!P_b) rationale.push(CONFIDENCE_MESSAGES.MISSING_BETA);
  if (!P_e) rationale.push(CONFIDENCE_MESSAGES.MISSING_EVIDENCE);
  if (sampleCount < GUARDRAILS.MIN_SAMPLE_COUNT) { rationale.push(CONFIDENCE_MESSAGES.CRIT_LOW_SAMPLE_COUNT); combined_raw *= GUARDRAILS.SAMPLE_COUNT_PENALTY_FACTOR; }
  if (dq.bootstrapScore && dq.bootstrapScore < 60) rationale.push(CONFIDENCE_MESSAGES.WARN_BETA_VARIANCE_HIGH);
  if (S_evidence !== null && S_evidence < GUARDRAILS.EVIDENCE_CONFLICT_THRESHOLD) { rationale.push(CONFIDENCE_MESSAGES.WARN_EVIDENCE_CONFLICT); combined_raw *= GUARDRAILS.EVIDENCE_CONFLICT_FACTOR; }

  // Final capping and guardrails
  let capped = Math.round(clamp(combined_raw, 0, 100));
  let confidenceCapped = false;
  let capReason = null;
  const fabricCode = fabric?.fabricCode ?? null;
  const betaWithheld = !(beta && beta.calculated);

  // Primary: beta withheld
  if (betaWithheld && capped > CONFIDENCE_MAX_WITHHELD) {
    rationale.push(CONFIDENCE_MESSAGES.GUARDRAIL_BETA_WITHHELD);
    capped = CONFIDENCE_MAX_WITHHELD;
    confidenceCapped = true;
    capReason = 'BETA_WITHHELD';
  } else if ((fabricCode && BANNED_HIGH_CONFIDENCE_FABRICS.includes(fabricCode)) && capped > CONFIDENCE_MAX_WITHHELD) {
    rationale.push(typeof CONFIDENCE_MESSAGES.GUARDRAIL_FABRIC_BANNED === 'function' ? CONFIDENCE_MESSAGES.GUARDRAIL_FABRIC_BANNED(fabricCode) : CONFIDENCE_MESSAGES.GUARDRAIL_FABRIC_BANNED);
    capped = CONFIDENCE_MAX_WITHHELD;
    confidenceCapped = true;
    capReason = `FABRIC_BANNED_${fabricCode}`;
  }

  const finalScore = Math.round(Math.min(THRESHOLDS.CONFIDENCE_CAP, capped));
  const rating = findConfidenceClass(finalScore);

  const data = {
    score: finalScore,
    rating,
    components: { fabric: S_fabric, beta: S_beta, evidence: S_evidence, dataQuality: dq.combined },
    weights: Wp,
    dataQuality: dq,
    penaltyMultiplier,
    rationale,
    confidenceCapped,
    capReason
  };

  return { success: true, warnings, errors, data };
}
