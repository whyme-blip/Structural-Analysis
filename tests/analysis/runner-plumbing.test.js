// tests/analysis/runner-plumbing.test.js
import { getFinalConfidenceFromPhase } from '../../src/utils/confidenceAccessor.js';

function assert(cond,msg){ if(!cond) throw new Error(msg); }

(function run(){
  // Case A: canonical shape
  const phaseA = { results: { confidence: { score: 60, confidenceCapped: true, capReason: 'BETA_WITHHELD' } } };
  const vA = getFinalConfidenceFromPhase(phaseA);
  console.log('plumbing A', vA);
  assert(vA === 60, 'Expected final confidence 60 for canonical shape');

  // Case B: legacy wrapper shape
  const phaseB = { results: { confidence: { data: { score: 55 }, confidenceCapped: false } } };
  const vB = getFinalConfidenceFromPhase(phaseB);
  console.log('plumbing B', vB);
  assert(vB === 55, 'Expected final confidence 55 for legacy wrapper');

  // Case C: missing/confidence null
  const phaseC = { results: { confidence: null } };
  const vC = getFinalConfidenceFromPhase(phaseC);
  console.log('plumbing C', vC);
  assert(vC === null, 'Expected null for missing confidence');

  console.log('runner-plumbing.test.js passed');
})();
