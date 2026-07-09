// src/utils/confidenceAccessor.js
export function getFinalConfidenceFromPhase(phase){
  if (!phase || !phase.results) return null;
  const conf = phase.results.confidence;
  if (!conf) return null;
  if (typeof conf.score === 'number') return conf.score; // canonical post-cap shape
  if (conf.data && typeof conf.data.score === 'number') return conf.data.score; // legacy wrapper
  return null;
}
