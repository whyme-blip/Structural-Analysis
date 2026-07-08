// tests/analysis/phaseRouter.test.js
import { buildAnalysisPipelineFromParser } from '../../src/analysis/phaseRouter.js';

// Basic unit tests (informal runner)
function assert(cond, msg){ if (!cond) throw new Error(msg); }

(function run(){
  const parserOut = {
    metadata: { parserVersion: '2.0', totalRecords: 2 },
    inventory: { stations: [], domains: [], lithologies: [], generations: [] },
    records: [
      { station: 'A', structure: 'S1', domain: 'X', strike: 100, dip: 30, generation: 1 },
      { station: 'B', structure: 'L1', domain: 'X', strike: 110, dip: 10, generation: 1 }
    ]
  };
  const res = buildAnalysisPipelineFromParser(parserOut);
  assert(res.success === true, 'build should succeed');
  const p = res.data.phases.F1;
  assert(p.planarRecords.length === 1, 'F1 planar count');
  assert(p.linearRecords.length === 1, 'F1 linear count');
  console.log('phaseRouter.test.js passed');
})();
