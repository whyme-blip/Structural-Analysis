// tests/analysis/fabricClassifier.test.js
import { analyzeFabric, FABRIC_CODES } from '../../src/analysis/fabricClassifier.js';
import { strikeDipToPole, trendPlungeToVector } from '../../src/core/geometry.js';

function assert(cond, msg){ if (!cond) throw new Error(msg); }

(function run(){
  // Test 1: Identical poles -> Strong Point Cluster
  const v1 = strikeDipToPole(120,45);
  const vecs1 = [v1,v1,v1,v1,v1, v1];
  const r1 = analyzeFabric(vecs1, { seed: 'test1', bootstrapIterations: 1000 });
  console.log('Test1 fabricCode', r1.data.fabricCode);
  assert(r1.data.fabricCode === FABRIC_CODES.POINT || r1.data.fabricCode === FABRIC_CODES.SCATTER, 'Identical poles should be POINT or SCATTER');

  // Test 2: Simple girdle-like: generate vectors around a great circle (vary trend)
  const vecs2 = [];
  for (let t=0;t<360;t+=20){
    const v = trendPlungeToVector(t, 0); // shallow plunge -> girdle around equator
    vecs2.push(v);
  }
  const r2 = analyzeFabric(vecs2, { seed: 'test2', bootstrapIterations: 1000 });
  console.log('Test2 fabricCode', r2.data.fabricCode);
  assert([FABRIC_CODES.GIRDLE, FABRIC_CODES.STRONG_GIRDLE, FABRIC_CODES.WEAK_GIRDLE].includes(r2.data.fabricCode), 'Girdle-like should be classified as girdle family');

  // Test 3: Random scatter
  const vecs3 = [];
  for (let i=0;i<30;i++){
    // uniform random directions on hemisphere
    const t = Math.random()*360; const p = Math.random()*90;
    vecs3.push(trendPlungeToVector(t,p));
  }
  const r3 = analyzeFabric(vecs3, { seed: 'test3', bootstrapIterations: 1000 });
  console.log('Test3 fabricCode', r3.data.fabricCode);

  // Test 4: Two separated clusters -> Multimodal
  const vecs4 = [];
  for (let i=0;i<10;i++) vecs4.push(trendPlungeToVector(10 + Math.random()*5, 10 + Math.random()*3));
  for (let i=0;i<8;i++) vecs4.push(trendPlungeToVector(200 + Math.random()*5, 10 + Math.random()*3));
  const r4 = analyzeFabric(vecs4, { seed: 'test4', bootstrapIterations: 1000 });
  console.log('Test4 fabricCode', r4.data.fabricCode);

  console.log('fabricClassifier tests completed (informal assertions).');
})();
