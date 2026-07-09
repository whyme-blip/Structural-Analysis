// src/analysis/confidenceEngine/penalties.js
import { CONFIDENCE_PENALTIES, CONFIDENCE_MESSAGES } from '../../constants.js';

export function applyPenalties(rawScore, presence, rationale) {
  let penaltyMultiplier = 1.0;
  
  if (!presence.P_b && !presence.P_e) {
    penaltyMultiplier = CONFIDENCE_PENALTIES.MISSING_BOTH_MAJOR;
  } else if (!presence.P_b || !presence.P_e) {
    penaltyMultiplier = CONFIDENCE_PENALTIES.MISSING_ONE_MAJOR;
  }

  if (!presence.P_b) rationale.push(CONFIDENCE_MESSAGES.MISSING_BETA);
  if (!presence.P_e) rationale.push(CONFIDENCE_MESSAGES.MISSING_EVIDENCE);

  return rawScore * penaltyMultiplier;
}
