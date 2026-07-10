#!/usr/bin/env node
// scripts/run-validation.js
// Run the validation pipeline across the synthetic regression datasets and produce demo/output reports.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseCSV } from '../src/ingest/parser.js';
import { buildAnalysisPipelineFromParser } from '../src/analysis/phaseRouter.js';
import { partitionPhaseDomains } from '../src/analysis/domainRouter.js';
import { analyzeFabric } from '../src/analysis/fabricClassifier.js';
import { computeBeta } from '../src/analysis/betaEngine.js';
import { computeEvidence } from '../src/analysis/evidenceEngine.js';
import { computeConfidence } from '../src/analysis/confidenceEngine/confidenceEngine.js';
import { THRESHOLDS, SOFTWARE_DEFAULT_SEED, SOFTWARE_VERSION, DEFAULT_PHASE_NAMES, CONFIDENCE_MAX_WITHHELD } from '../src/constants.js';
import { createSeededRNG } from '../src/utils/rng.js';
import { DATASETS } from '../tests/fixtures/index.js';
import { getFinalConfidenceFromPhase } from '../src/utils/confidenceAccessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage() {
  console.log(`Usage: node scripts/run-validation.js [--preset quick|standard|research] [--dataset name] [--verbose]

Examples:
  node scripts/run-validation.js
  node scripts/run-validation.js --preset standard --dataset StrongGirdle --verbose
`);
}

function buildCSV(records) {
  const header = ['station','structure','strike','dip','generation','domain','lithology'];
  const lines = [header.join(',')];
  for (const r of records) {
    lines.push([
      r.station||'',
      r.structure||'',
      r.strike||'',
      r.dip||'',
      r.generation||'',
      r.domain||'',
      r.lithology||''
    ].join(','));
  }
  return lines.join('\n');
}

function uniq(a){ return Array.from(new Set(a)); }

function ensureDir(dir){ if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

async function runOne(name, records, options){
  const csv = buildCSV(records);
  const parsed = parseCSV(csv);
  if (!parsed || (typeof parsed === 'object' && ('success' in parsed) && !parsed.success)) throw new Error('Parser failed for '+name);
  const pipelineRes = buildAnalysisPipelineFromParser(parsed);
  if (!pipelineRes.success) throw new Error('Phase router failed for '+name);
  const pipeline = pipelineRes.data;

  // partition domains
  for (const pn of DEFAULT_PHASE_NAMES){
    const p = pipeline.phases[pn];
    if (!p) continue;
    const pr = partitionPhaseDomains(p);
    if (!pr.success) throw new Error('Domain partition failed for '+name+' '+pn);
    pipeline.phases[pn] = pr.data;
  }

  // run per-phase analyses
  for (const pn of DEFAULT_PHASE_NAMES){
    const phase = pipeline.phases[pn];
    if (!phase) continue;
    const vectors = (phase.planarRecords || []).map(r=>r.vector).filter(Boolean);
    if (vectors.length === 0) continue;

    const fabRes = analyzeFabric(vectors, { seed: options.seed, bootstrapIterations: options.bootstrapIterations });
    if (!fabRes.success) throw new Error('Fabric analysis failed for '+name+' '+pn);

    phase.results = phase.results || {};
    const stationCount = new Set((phase.planarRecords || []).map(r=>r.station)).size;
    const domainCount = phase.domains ? Object.keys(phase.domains).length : 0;
    phase.results.fabric = Object.assign({}, fabRes.data, { sampleCount: vectors.length, stationCount, domainCount });

    const betaRes = computeBeta(phase, { seed: options.seed, bootstrapIterations: options.bootstrapIterations, preset: options.presetLabel });
    if (!betaRes.success) throw new Error('Beta engine failed for '+name+' '+pn);
    phase.results.beta = betaRes.data;

    const ev = computeEvidence(phase);
    if (!ev.success) throw new Error('Evidence engine failed for '+name+' '+pn);
    // Strict contract: evidence goes to phase.results.evidence
    phase.results.evidence = ev.data;

    const conf = computeConfidence(phase);
    if (!conf.success) throw new Error('Confidence engine failed for '+name+' '+pn);
    // Confidence Engine returns canonical data object
    phase.results.confidence = conf.data;
  }

  return pipeline;
}

// helper: axial angular difference between two trend/plunge or vector objects
import { angularDistance, trendPlungeToVector } from '../src/core/geometry.js';
function axialAngleBetween(a,b){
  if (!a || !b) return null;
  const toVec = v => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && 'x' in v) return [v.x, v.y, v.z];
    if (v && typeof v === 'object' && 'trend' in v && 'plunge' in v) return trendPlungeToVector(v.trend, v.plunge);
    return null;
  };
  const va = toVec(a); const vb = toVec(b);
  if (!va || !vb) return null;
  const raw = angularDistance(va, vb);
  return Math.min(raw, 180 - raw);
}

async function main(){
  const argv = process.argv.slice(2);
  const opts = { preset: 'quick', verbose: false, dataset: null };
  for (let i=0;i<argv.length;i++){
    const a = argv[i];
    if (a === '--preset' && argv[i+1]) { opts.preset = argv[++i]; }
    else if (a === '--dataset' && argv[i+1]) { opts.dataset = argv[++i]; }
    else if (a === '--verbose') { opts.verbose = true; }
    else if (a === '--help' || a === '-h') { usage(); return; }
  }

  const presetLabel = (opts.preset || 'quick').toUpperCase();
  const presetMap = { QUICK: THRESHOLDS.BOOTSTRAP_PRESETS.QUICK, STANDARD: THRESHOLDS.BOOTSTRAP_PRESETS.STANDARD, RESEARCH: THRESHOLDS.BOOTSTRAP_PRESETS.RESEARCH };
  const bootstrapIterations = presetMap[presetLabel] || THRESHOLDS.BOOTSTRAP_PRESETS.QUICK;
  const seed = SOFTWARE_DEFAULT_SEED || '1337';

  const outdir = path.resolve(process.cwd(), 'demo','output');
  ensureDir(outdir);

  const summary = [];
  const metadata = { softwareVersion: SOFTWARE_VERSION || '1.0.0', constantsVersion: 'v1.0.0', bootstrapPreset: opts.preset, bootstrapIterations, seed, generatedAt: new Date().toISOString() };

  const datasetNames = opts.dataset ? [opts.dataset] : Object.keys(DATASETS);
  let hardFailure = false;

  for (const name of datasetNames){
    console.log('Running dataset', name);
    const rng = createSeededRNG(seed + ':' + name);
    const records = DATASETS[name](rng);
    const pipeline = await runOne(name, records, { seed, bootstrapIterations, presetLabel });
    const phase = pipeline.phases.F1;
    const fabric = phase.results?.fabric ?? null;
    const beta = phase.results?.beta ?? null;
    const evidence = phase.results?.evidence ?? null;
    const confidenceObj = phase.results?.confidence ?? null;

    // final post-cap score (canonical accessor)
    const confScore = getFinalConfidenceFromPhase(phase);
    const confRating = confidenceObj?.rating ?? null;
    const confCapped = !!confidenceObj?.confidenceCapped;
    const confCapReason = confidenceObj?.capReason ?? null;

    const schemaFailures = [];
    if (!fabric || !fabric.fabricCode) schemaFailures.push('Invalid fabric schema');
    if (!beta || (!('calculated' in beta))) schemaFailures.push('Invalid beta schema');
    if (!confidenceObj || typeof confScore !== 'number') schemaFailures.push('Invalid confidence schema');

    let domainBetaDiff = null;
    if (name === 'TwoDomain'){
      const domainA = pipeline.phases.F1.domains?.['A'] ?? null;
      const domainB = pipeline.phases.F1.domains?.['B'] ?? null;
      if (domainA && domainB){
        const va = domainA.results?.beta ?? null;
        const vb = domainB.results?.beta ?? null;
        if (va && vb && va.trend !== undefined && vb.trend !== undefined){
          const diff = Math.abs(va.trend - vb.trend);
          domainBetaDiff = Math.min(diff, 360 - diff);
        }
      }
    }

    const fabricCode = fabric?.fabricCode ?? null;
    const betaCalculated = !!beta?.calculated;
    const betaQuality = beta?.quality?.grade ?? null;
    const evidenceGrade = evidence?.overallAgreement ? evidence.overallAgreement.grade : (evidence?.grade ?? null);
    const evidenceScore = evidence?.overallAgreement?.score ?? evidence?.overallScore ?? null;

    const datasetOut = {
      dataset: name,
      fabric: fabric ? { code: fabric.fabricCode, confidence: fabric.fabricConfidence, tensorStability: fabric.tensorStability } : null,
      beta: beta ? { calculated: beta.calculated, trend: beta.trend, plunge: beta.plunge, bootstrapCI: beta?.bootstrap?.angularCI ?? null, quality: beta?.quality || null } : null,
      evidence: evidence ? { overallGrade: evidence.overallAgreement ? evidence.overallAgreement.grade : null, overallScore: evidenceScore } : null,
      confidence: confidenceObj ? { score: confScore, rating: confRating, confidenceCapped: confCapped, capReason: confCapReason } : null,
      failures: [],
      warnings: []
    };

    if (schemaFailures.length) datasetOut.failures.push(...schemaFailures);

    // expectations (use confScore which is post-cap)
    const exps = {
      PointCluster: [
        { key: 'fabricCode', test: v => v === 'POINT', message: 'fabricCode === POINT' },
        { key: 'betaCalculated', test: v => v === false, message: 'beta.calculated === false' }
      ],
      WeakGirdle: [
        { key: 'fabricCode', test: v => ['WEAK_GIRDLE','GIRDLE'].includes(v), message: 'fabricCode in {WEAK_GIRDLE,GIRDLE}', soft: true },
        { key: 'confidence', test: v => typeof v === 'number' ? (v >=45 && v <=75) : true, message: 'confidence between 45 and 75', soft: true }
      ],
      StrongGirdle: [
        { key: 'fabricCode', test: v => ['STRONG_GIRDLE','GIRDLE'].includes(v), message: 'fabricCode in {STRONG_GIRDLE,GIRDLE}' },
        { key: 'betaCalculated', test: v => v === true, message: 'beta.calculated === true' },
        { key: 'confidence', test: v => typeof v === 'number' && v >= 90, message: 'confidence >= 90' }
      ],
      Polyphase: [
        { key: 'fabricCode', test: v => v === 'MULTIMODAL', message: 'fabricCode === MULTIMODAL' },
        { key: 'betaCalculated', test: v => v === false, message: 'beta.calculated === false' }
      ],
      RandomScatter: [
        { key: 'fabricCode', test: v => ['RANDOM','SCATTER','RANDOM/SCATTER'].includes(v), message: 'fabricCode in {RANDOM,SCATTER,RANDOM/SCATTER}' },
        { key: 'betaCalculated', test: v => v === false, message: 'beta.calculated === false' }
      ],
      TwoDomain: [
        { key: 'domainBetaDiff', test: v => typeof v === 'number' && v > 15, message: 'Domain beta axes differ by >15°' }
      ]
    };

    const ex = exps[name] || [];
    for (const e of ex){
      let val = null;
      switch(e.key){
        case 'fabricCode': val = fabricCode; break;
        case 'betaCalculated': val = betaCalculated; break;
        case 'confidence': val = confScore; break;
        case 'domainBetaDiff': val = domainBetaDiff; break;
        default: val = null;
      }
      const ok = e.test(val);
      if (!ok){
        const msg = `${e.message} (actual: ${val})`;
        if (e.soft) datasetOut.warnings.push(msg);
        else datasetOut.failures.push(msg);
      }
    }

    // hard CI rules evaluated against final (post-cap) score
    if (!betaCalculated && confScore !== null && confScore > CONFIDENCE_MAX_WITHHELD) {
      datasetOut.failures.push(`HARD_GUARDRAIL_VIOLATION: beta withheld but final confidence ${confScore} > ${CONFIDENCE_MAX_WITHHELD}`);
    }
    if (fabricCode && ['POINT','RANDOM','SCATTER','RANDOM/SCATTER','MULTIMODAL'].includes(fabricCode) && confScore !== null && confScore > CONFIDENCE_MAX_WITHHELD){
      datasetOut.failures.push(`HARD_GUARDRAIL_VIOLATION: fabric ${fabricCode} but final confidence ${confScore} > ${CONFIDENCE_MAX_WITHHELD}`);
    }

    let status = 'PASS';
    if (datasetOut.failures.length) { status = 'FAIL'; hardFailure = true; }
    else if (datasetOut.warnings.length) status = 'WARN';

    summary.push({ dataset: name, records: phase.results.fabric?.sampleCount || 0, stationCount: phase.results.fabric?.stationCount || 0, fabricCode, betaCalculated, betaQuality, evidenceGrade, evidenceScore, confidenceScore: confScore, confidenceRating: confRating, status });

    fs.writeFileSync(path.join(outdir, `${name}.json`), JSON.stringify(datasetOut, null, 2));

    if (name === 'StrongGirdle' || name === 'PointCluster'){
      fs.writeFileSync(path.join(outdir, `${name}.confidence.json`), JSON.stringify(phase.results.confidence || {}, null, 2));
    }

    if (opts.verbose) console.log('Pipeline for', name, JSON.stringify(datasetOut, null, 2));
  }

  // write QC summary files
  const csvHeader = ['Dataset','Fabric','Beta','BetaQuality','Evidence','Confidence','Status'];
  const lines = [csvHeader.join('\t')];
  for (const row of summary){
    const betaText = row.betaCalculated ? 'Calculated' : 'Withheld';
    const evidenceText = row.evidenceGrade || '—';
    const confText = row.confidenceScore !== null ? String(row.confidenceScore) : 'NA';
    lines.push([row.dataset,row.fabricCode || 'NA',betaText,row.betaQuality || 'NA',evidenceText,confText,row.status].join('\t'));
  }
  fs.writeFileSync(path.join(outdir,'qc-summary.csv'), lines.join('\n'));

  const mdLines = ['# Validation QC Summary','', '| Dataset | Fabric | β | BetaQuality | Evidence | Confidence | Status |','|---|---:|---|---|---|---:|---|'];
  for (const row of summary){
    const betaText = row.betaCalculated ? 'Calculated' : 'Withheld';
    const evidenceText = row.evidenceGrade || '—';
    const confText = row.confidenceScore !== null ? String(row.confidenceScore) : 'NA';
    const betaQual = row.betaQuality || 'NA';
    mdLines.push(`| ${row.dataset} | ${row.fabricCode || 'NA'} | ${betaText} | ${betaQual} | ${evidenceText} | ${confText} | ${row.status} |`);
  }
  fs.writeFileSync(path.join(outdir,'qc-summary.md'), mdLines.join('\n'));
  fs.writeFileSync(path.join(outdir,'qc-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outdir,'validation-metadata.json'), JSON.stringify(metadata, null, 2));

  console.log('Validation complete. Output written to', outdir);

  if (hardFailure){
    console.error('Validation contained hard failures. See demo/output for details.');
    process.exit(1);
  }
}

main().catch(err=>{ console.error('Validation run failed:', err); process.exit(1); });
