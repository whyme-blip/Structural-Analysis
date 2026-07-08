// src/analysis/phaseRouter.js
// Build the canonical analysisPipeline object from parser output
// The function is pure and returns the standard envelope: { success, warnings, errors, data }

import { SOFTWARE_VERSION } from '../constants.js';
import { ensurePhaseShape } from '../validator/validator.js';

function buildBasePhaseObject(phaseName, parserVersion) {
  return ensurePhaseShape({ metadata: { phase: phaseName, parserVersion, softwareVersion: SOFTWARE_VERSION, generatedAt: new Date().toISOString(), sampleCount: 0 } }, phaseName);
}

function buildAnalysisPipelineFromParser(parserOutput) {
  const warnings = [];
  const errors = [];
  if (!parserOutput || typeof parserOutput !== 'object') {
    errors.push({ code: 'invalid_parser_output', message: 'Parser output is required' });
    return { success: false, warnings, errors, data: null };
  }

  const parserVersion = (parserOutput.metadata && parserOutput.metadata.parserVersion) || null;
  const metadata = {
    generatedAt: new Date().toISOString(),
    parserVersion,
    softwareVersion: SOFTWARE_VERSION,
    sampleCount: parserOutput.metadata ? parserOutput.metadata.totalRecords : (parserOutput.records ? parserOutput.records.length : 0)
  };

  const inventory = parserOutput.inventory || { stations: [], domains: [], lithologies: [], generations: [] };

  // initialize phases
  const phases = { F1: buildBasePhaseObject('F1', parserVersion), F2: buildBasePhaseObject('F2', parserVersion), F3: buildBasePhaseObject('F3', parserVersion) };

  // also include S0 grouping at top-level under global for bedding inventory if needed
  // iterate parser records and populate phases
  const records = Array.isArray(parserOutput.records) ? parserOutput.records : [];

  records.forEach(rec => {
    // determine where to place record
    const struct = (rec.structure || '').toUpperCase();
    // planarRecords: S1->F1, S2->F2, S3->F3, S0 stored under F0? We keep S0 in global inventory via metadata
    if (struct === 'S1') {
      phases.F1.planarRecords.push(rec);
      phases.F1.stations.push(rec.station);
      phases.F1.metadata.sampleCount = phases.F1.planarRecords.length;
    } else if (struct === 'S2') {
      phases.F2.planarRecords.push(rec);
      phases.F2.stations.push(rec.station);
      phases.F2.metadata.sampleCount = phases.F2.planarRecords.length;
    } else if (struct === 'S3') {
      phases.F3.planarRecords.push(rec);
      phases.F3.stations.push(rec.station);
      phases.F3.metadata.sampleCount = phases.F3.planarRecords.length;
    }

    // linear records
    if (struct === 'L1') { phases.F1.linearRecords.push(rec); }
    if (struct === 'L2') { phases.F2.linearRecords.push(rec); }
    if (struct === 'L3') { phases.F3.linearRecords.push(rec); }

    // fold axes
    if (struct === 'FA1') { phases.F1.foldAxes.push(rec); }
    if (struct === 'FA2') { phases.F2.foldAxes.push(rec); }
    if (struct === 'FA3') { phases.F3.foldAxes.push(rec); }

    // domains: ensure domain objects exist
    const domain = rec.domain || 'Default';
    // populate domain containers lazily
    ['F1','F2','F3'].forEach(pn => {
      if (!phases[pn].domains[domain]) phases[pn].domains[domain] = { metadata: { phase: pn, domain, parserVersion }, planarRecords: [], linearRecords: [], foldAxes: [], stations: [], derived: {}, results: {} };
    });

    // place record also into the domain bucket of its phase if it belongs to that phase
    if (struct === 'S1') {
      phases.F1.domains[domain].planarRecords.push(rec);
      if (!phases.F1.domains[domain].stations.includes(rec.station)) phases.F1.domains[domain].stations.push(rec.station);
    }
    if (struct === 'S2') {
      phases.F2.domains[domain].planarRecords.push(rec);
      if (!phases.F2.domains[domain].stations.includes(rec.station)) phases.F2.domains[domain].stations.push(rec.station);
    }
    if (struct === 'S3') {
      phases.F3.domains[domain].planarRecords.push(rec);
      if (!phases.F3.domains[domain].stations.includes(rec.station)) phases.F3.domains[domain].stations.push(rec.station);
    }

    if (struct === 'L1') { phases.F1.domains[domain].linearRecords.push(rec); }
    if (struct === 'L2') { phases.F2.domains[domain].linearRecords.push(rec); }
    if (struct === 'L3') { phases.F3.domains[domain].linearRecords.push(rec); }

    if (struct === 'FA1') { phases.F1.domains[domain].foldAxes.push(rec); }
    if (struct === 'FA2') { phases.F2.domains[domain].foldAxes.push(rec); }
    if (struct === 'FA3') { phases.F3.domains[domain].foldAxes.push(rec); }
  });

  const global = { regionalTensor: null, regionalBeta: null, regionalInterpretation: null, regionalRecommendations: null, regionalLimitations: null };

  const analysisPipeline = { metadata, inventory, phases, global };

  return { success: true, warnings, errors, data: analysisPipeline };
}

export { buildAnalysisPipelineFromParser };
