// src/analysis/domainRouter.js
// Partition phases into domain objects and compute simple statistics. Returns the standard envelope.

import { ensurePhaseShape } from '../validator/validator.js';

function partitionPhaseDomains(phaseObj) {
  const warnings = [];
  const errors = [];
  if (!phaseObj || typeof phaseObj !== 'object') {
    errors.push({ code: 'invalid_phase', message: 'Phase object required' });
    return { success: false, warnings, errors, data: null };
  }

  const phase = ensurePhaseShape(phaseObj, phaseObj && phaseObj.metadata && phaseObj.metadata.phase);

  // for each domain in phase.domains ensure shape and compute stats
  const domains = phase.domains || {};
  Object.keys(domains).forEach(dname => {
    const d = domains[dname];
    // ensure arrays
    d.planarRecords = Array.isArray(d.planarRecords) ? d.planarRecords : [];
    d.linearRecords = Array.isArray(d.linearRecords) ? d.linearRecords : [];
    d.foldAxes = Array.isArray(d.foldAxes) ? d.foldAxes : [];
    d.stations = Array.isArray(d.stations) ? d.stations : [];
    d.metadata = Object.assign({}, d.metadata, { domain: dname, sampleCount: d.planarRecords.length + d.linearRecords.length + d.foldAxes.length });
    // results placeholders
    d.results = d.results || { tensor: null, eigen: null, woodcock: null, fisher: null, bootstrap: null, beta: null, evidence: null, confidence: null, interpretation: null, recommendations: [], limitations: [], qc: { warnings: [], errors: [], passed: false } };
    // basic stats
    d.stats = {
      nPlanar: d.planarRecords.length,
      nLinear: d.linearRecords.length,
      nFoldAxes: d.foldAxes.length,
      nStations: d.stations.length,
      missingYounging: (d.planarRecords.filter(r => !r.younging || r.younging === 'unknown').length)
    };
  });

  // attach computed domain stats to phase
  phase.domains = domains;
  phase.stats = {
    nPlanar: phase.planarRecords.length,
    nLinear: phase.linearRecords.length,
    nFoldAxes: phase.foldAxes.length,
    nStations: Array.from(new Set(phase.stations)).length,
    missingYounging: (phase.planarRecords.filter(r => !r.younging || r.younging === 'unknown').length)
  };

  return { success: true, warnings, errors, data: phase };
}

export { partitionPhaseDomains };
