import { computeEvidence } from '../../src/analysis/evidenceEngine.js';
import { trendPlungeToVector, strikeDipToPole } from '../../src/core/geometry.js';
import { analyzeFabric } from '../../src/analysis/fabricClassifier.js';

function assert(condition, message) {
  if (!condition)
    throw new Error(message);
}

(function run() {

  const planar = [];

  for (let strike = 0; strike < 360; strike += 30) {

    planar.push({

      vector: strikeDipToPole(strike, 10),
      station: `S${strike}`,
      domain: 'A'

    });
  }

  const fabric = analyzeFabric(
    planar.map(r => r.vector),
    {
      seed: 'Evidence-Test',
      bootstrapIterations: 1000
    }
  ).data;

  const beta = {

    success: true,
    calculated: true,

    vector: {

      lowerHemisphere: {

        x: fabric.eigen.vectors[2][0],
        y: fabric.eigen.vectors[2][1],
        z: fabric.eigen.vectors[2][2]

      }

    }

  };

  const phase = {

    planarRecords: planar,

    foldAxes: [

      { vector: trendPlungeToVector(10, 5) },
      { vector: trendPlungeToVector(12, 4) }

    ],

    linearRecords: [

      { vector: trendPlungeToVector(9, 2) },
      { vector: trendPlungeToVector(11, 3) }

    ],

    results: {

      beta

    }

  };

  const result = computeEvidence(phase);

  assert(
    result.success,
    'Evidence Engine should succeed.'
  );

  assert(
    result.data.agreement,
    'Agreement object missing.'
  );

  console.log(
    '✓ evidenceEngine.test.js passed'
  );

})();
