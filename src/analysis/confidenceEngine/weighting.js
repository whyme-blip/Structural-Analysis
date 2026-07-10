// src/analysis/confidenceEngine/weighting.js
import { CONFIDENCE_WEIGHTS } from '../../constants.js';

export function applyWeights({ S_fabric, S_beta, S_evidence, dqCombined }) {
  const P_f = S_fabric !== null;
  const P_b = S_beta !== null;
  const P_e = S_evidence !== null;

  const presentWeightSum = (P_f ? CONFIDENCE_WEIGHTS.FABRIC : 0) + 
                           (P_b ? CONFIDENCE_WEIGHTS.BETA : 0) + 
                           (P_e ? CONFIDENCE_WEIGHTS.EVIDENCE : 0) + 
                           CONFIDENCE_WEIGHTS.DATA_QUALITY;

  const Wp = {
    FABRIC: P_f ? CONFIDENCE_WEIGHTS.FABRIC / presentWeightSum : 0,
    BETA: P_b ? CONFIDENCE_WEIGHTS.BETA / presentWeightSum : 0,
    EVIDENCE: P_e ? CONFIDENCE_WEIGHTS.EVIDENCE / presentWeightSum : 0,
    DATA_QUALITY: CONFIDENCE_WEIGHTS.DATA_QUALITY / presentWeightSum
  };

  const rawScore = ((S_fabric || 0) * Wp.FABRIC) + 
                   ((S_beta || 0) * Wp.BETA) + 
                   ((S_evidence || 0) * Wp.EVIDENCE) + 
                   (dqCombined * Wp.DATA_QUALITY);

  return { rawScore, weights: Wp, presence: { P_f, P_b, P_e } };
}
