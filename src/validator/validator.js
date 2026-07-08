// src/validator/validator.js
// Ensures analysisPipeline objects contain reserved placeholders so downstream engines do not crash

import { SOFTWARE_VERSION } from '../constants.js';

function ensureResultsPlaceholders(results) {
  const template = {
    tensor: null,
    eigen: null,
    woodcock: null,
    fisher: null,
    bootstrap: null,
    beta: null,
    evidence: null,
    confidence: null,
    interpretation: null,
    recommendations: [],
    limitations: [],
    qc: { warnings: [], errors: [], passed: false }
  };
  if (!results || typeof results !== 'object') return Object.assign({}, template);
  const out = Object.assign({}, template, results);
  // ensure qc sub-object exists
  out.qc = Object.assign({}, template.qc, out.qc || {});
  return out;
}

function ensureDerivedPlaceholders(derived) {
  const template = {
    betaAxis: null,
    fisherMeanPole: null,
    meanFoldAxis: null,
    meanLineation: null,
    girdlePole: null
  };
  if (!derived || typeof derived !== 'object') return Object.assign({}, template);
  return Object.assign({}, template, derived);
}

function ensurePhaseShape(phase, phaseName = '') {
  const metadata = phase && phase.metadata ? Object.assign({}, phase.metadata) : { phase: phaseName, generatedAt: new Date().toISOString(), parserVersion: null, softwareVersion: SOFTWARE_VERSION, sampleCount: 0 };
  const planarRecords = Array.isArray(phase && phase.planarRecords) ? phase.planarRecords : [];
  const linearRecords = Array.isArray(phase && phase.linearRecords) ? phase.linearRecords : [];
  const foldAxes = Array.isArray(phase && phase.foldAxes) ? phase.foldAxes : [];
  const stations = Array.isArray(phase && phase.stations) ? phase.stations : [];
  const domains = phase && phase.domains && typeof phase.domains === 'object' ? phase.domains : {};
  const derived = ensureDerivedPlaceholders(phase && phase.derived);
  const results = ensureResultsPlaceholders(phase && phase.results);
  return { metadata, planarRecords, linearRecords, foldAxes, stations, domains, derived, results };
}

function validateAnalysisPipeline(pipeline) {
  const outWarnings = [];
  const outErrors = [];
  if (!pipeline || typeof pipeline !== 'object') {
    outErrors.push({ code: 'invalid_pipeline', message: 'analysisPipeline is not an object' });
    return { success: false, warnings: outWarnings, errors: outErrors, data: null };
  }
  const meta = pipeline.metadata || { generatedAt: new Date().toISOString(), parserVersion: null, softwareVersion: SOFTWARE_VERSION };
  const inventory = pipeline.inventory || { stations: [], domains: [], lithologies: [], generations: [] };
  const phases = pipeline.phases || {};
  const fixedPhases = {};
  ['F1','F2','F3'].forEach(pn => {
    fixedPhases[pn] = ensurePhaseShape(phases[pn], pn);
  });
  const global = pipeline.global || { regionalTensor: null, regionalBeta: null, regionalInterpretation: null, regionalRecommendations: null, regionalLimitations: null };

  const data = { metadata: meta, inventory, phases: fixedPhases, global };
  return { success: true, warnings: outWarnings, errors: outErrors, data };
}

export { ensureResultsPlaceholders, ensureDerivedPlaceholders, ensurePhaseShape, validateAnalysisPipeline };
