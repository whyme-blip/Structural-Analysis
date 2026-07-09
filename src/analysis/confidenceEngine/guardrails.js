// src/analysis/confidenceEngine/guardrails.js
import { GUARDRAILS, BANNED_HIGH_CONFIDENCE_FABRICS, CONFIDENCE_MAX_WITHHELD, CONFIDENCE_MESSAGES } from '../../constants.js';

export function applyGuardrails(score, { sampleCount, bootstrapScore, evidenceScore, fabricCode, betaWithheld, rationale }) {
  let processedScore = score;

  if (sampleCount < GUARDRAILS.MIN_SAMPLE_COUNT) {
    rationale.push(CONFIDENCE_MESSAGES.CRIT_LOW_SAMPLE_COUNT);
    processedScore *= GUARDRAILS.SAMPLE_COUNT_PENALTY_FACTOR;
  }
  if (bootstrapScore && bootstrapScore < 60) {
    rationale.push(CONFIDENCE_MESSAGES.WARN_BETA_VARIANCE_HIGH);
  }
  if (evidenceScore !== null && evidenceScore < GUARDRAILS.EVIDENCE_CONFLICT_THRESHOLD) {
    rationale.push(CONFIDENCE_MESSAGES.WARN_EVIDENCE_CONFLICT);
    processedScore *= GUARDRAILS.EVIDENCE_CONFLICT_FACTOR;
  }

  let cappedScore = Math.round(Math.max(0, Math.min(processedScore, 100)));
  let confidenceCapped = false;
  let capReason = null;

  if (betaWithheld && cappedScore > CONFIDENCE_MAX_WITHHELD) {
    rationale.push(CONFIDENCE_MESSAGES.GUARDRAIL_BETA_WITHHELD);
    cappedScore = CONFIDENCE_MAX_WITHHELD;
    confidenceCapped = true;
    capReason = 'BETA_WITHHELD';
  } else if ((fabricCode && BANNED_HIGH_CONFIDENCE_FABRICS.includes(fabricCode)) && cappedScore > CONFIDENCE_MAX_WITHHELD) {
    rationale.push(CONFIDENCE_MESSAGES.GUARDRAIL_FABRIC_BANNED(fabricCode));
    cappedScore = CONFIDENCE_MAX_WITHHELD;
    confidenceCapped = true;
    capReason = `FABRIC_BANNED_${fabricCode}`;
  }

  return { score: cappedScore, confidenceCapped, capReason };
}
