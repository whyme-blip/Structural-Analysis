// src/analysis/confidenceEngine/confidenceEngine.js
import { THRESHOLDS, CONFIDENCE_CLASSES } from '../../constants.js';
import { computeDataQuality } from './dataQuality.js';
import { applyWeights } from './weighting.js';
import { applyPenalties } from './penalties.js';
import { applyGuardrails } from './guardrails.js';

function findConfidenceClass(score) {
  for (const c of CONFIDENCE_CLASSES) if (score >= c.min) return c.name;
  return 'Very Low';
}

export function computeConfidence(phase) {
  const rationale = [];
  if (!phase || typeof phase !== 'object') {
    return { success: false, errors: [{ code: 'invalid_phase', message: 'Phase data invalid' }], data: null };
  }

  const fabric = phase.results?.fabric || null;
  const beta = phase.results?.beta || null;
  const evidence = phase.results?.evidence || null;

  // Component normalization
  const S_fabric = fabric && typeof fabric.fabricConfidence === 'number' ? Math.max(0, Math.min(100, fabric.fabricConfidence)) : null;
  const S_beta = beta && beta.calculated && typeof beta.confidence === 'number' ? Math.round(Math.min(100, (beta.confidence * 100) / 95)) : null;
  const S_evidence = evidence && typeof evidence.overallScore === 'number' ? Math.max(0, Math.min(100, evidence.overallScore)) : null;

  const sampleCount = fabric && typeof fabric.sampleCount === 'number' ? fabric.sampleCount : (phase.planarRecords?.length || 0);
  const tensorStability = fabric?.tensorStability || null;
  const bootstrapAngularCI = fabric?.bootstrap?.angularCI || beta?.bootstrap?.angularCI || null;
  const rms = fabric?.rmsMisfit || beta?.rms || null;

  // 1. Data Quality Analysis
  const dq = computeDataQuality({ tensorStability, bootstrapAngularCI, rms, sampleCount });

  // 2. Linear Weight Combinations
  const weighted = applyWeights({ S_fabric, S_beta, S_evidence, dqCombined: dq.combined });

  // 3. Penalty Processing
  const penalizedScore = applyPenalties(weighted.rawScore, weighted.presence, rationale);

  // 4. Structural Guardrails and Hard Boundary Caps
  const guardrailed = applyGuardrails(penalizedScore, {
    sampleCount,
    bootstrapScore: dq.bootstrapScore,
    evidenceScore: S_evidence,
    fabricCode: fabric?.fabricCode || null,
    betaWithheld: !(beta && beta.calculated),
    rationale
  });

  const finalScore = Math.min(THRESHOLDS.CONFIDENCE_CAP, guardrailed.score);

  return {
    success: true,
    data: {
      score: finalScore,
      rating: findConfidenceClass(finalScore),
      components: { fabric: S_fabric, beta: S_beta, evidence: S_evidence, dataQuality: dq.combined },
      weights: weighted.weights,
      dataQuality: dq,
      rationale,
      confidenceCapped: guardrailed.confidenceCapped,
      capReason: guardrailed.capReason
    }
  };
}
