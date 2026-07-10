// src/ingest/parser.js
// Small CSV parser used by the runner. Accepts CSV string and returns { success, data }
// The runner expects parsed.planarRecords: array of objects with fields:
// { station, structure, strike, dip, generation, domain, lithology, vector? }

export function parseCSV(csvText = '') {
  if (!csvText || typeof csvText !== 'string') return { success: false, error: 'no_input' };

  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { success: false, error: 'empty' };

  // header detection
  const rawHeader = lines[0].split(',').map(h => h.trim().toLowerCase());
  const header = rawHeader.map(h => h.replace(/[^a-z0-9_]/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(s => s.trim());
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j] || `col${j}`;
      obj[key] = row[j] !== undefined ? row[j] : '';
    }
    // normalize fields expected by pipeline
    const normalized = {
      station: obj.station || obj.stn || obj.col0 || '',
      structure: obj.structure || obj.feature || '',
      strike: obj.strike || obj.trend || null,
      dip: obj.dip || obj.plunge || null,
      generation: obj.generation || '',
      domain: obj.domain || '',
      lithology: obj.lithology || ''
    };
    records.push(normalized);
  }

  // The pipeline expects planarRecords in phase.planarRecords; parser returns them directly
  return { success: true, data: { planarRecords: records } };
}
