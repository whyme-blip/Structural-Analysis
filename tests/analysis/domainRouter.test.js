// tests/analysis/domainRouter.test.js
import { partitionPhaseDomains } from '../../src/analysis/domainRouter.js';

function assert(cond, msg){ if (!cond) throw new Error(msg); }

(function run(){
  const phase = {
    metadata: { phase: 'F1' },
    planarRecords: [ { station: 'A', domain: 'X' }, { station: 'B', domain: 'Y' } ],
    linearRecords: [], foldAxes: [], stations: [] , domains: {}
  };
  const res = partitionPhaseDomains(phase);
  assert(res.success === true, 'partition should succeed');
  const data = res.data;
  // domains created
  assert(data.domains['X'], 'domain X exists');
  assert(data.domains['Y'], 'domain Y exists');
  console.log('domainRouter.test.js passed');
})();
