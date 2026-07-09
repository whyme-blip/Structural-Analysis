// src/analysis/confidenceEngine/dataQuality.js
import { DATA_QUALITY_BANDS } from '../../constants.js';

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function lookupBand(bands, value) {
  if (value === null || value === undefined) return null;
  for (const b of bands) {
    if ((b.maxDeg === undefined || value <= b.maxDeg) && (b.min === undefined || value >= b.min)) return b.score;
  }
  return null;
}

export function computeDataQuality({ tensorStability, bootstrapAngularCI, rms, sampleCount }) {
  const stabilityScore = clamp((tensorStability || 0), 0, 100);
  const bootstrapScore = lookupBand(DATA_QUALITY_BANDS.BOOTSTRAP, bootstrapAngularCI) ?? 60;
  const rmsScore = lookupBand(DATA_QUALITY_BANDS.RMS, rms) ?? 70;
  
  let sScore = 20;
  for (const b of DATA_QUALITY_BANDS.SAMPLE_SCORE_BANDS) {
    if (sampleCount >= b.min && sampleCount <= b.max) { sScore = b.score; break; }
  }

  const combined = Math.round(0.4 * stabilityScore + 0.3 * bootstrapScore + 0.2 * rmsScore + 0.1 * sScore);
  return { stabilityScore, bootstrapScore, rmsScore, sampleScore: sScore, combined };
}
