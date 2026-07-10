// src/ingest/parser.js
// CSV parser used by the runner. Returns { success, data } where data.planarRecords is an array of normalized records.
// Also provides a compatibility parse(rawData) wrapper as default export to handle legacy callers.

export function parseCSV(csvText = '') {
  if (!csvText || typeof csvText !== 'string') return { success: false, error: 'no_input' };

  // split lines, keep blank lines only if they contain a delimiter
  const lines = csvText.split(/\r?\n/).filter((ln) => {
    if (!ln) return false;
    // keep header-like lines
    return true;
  });
  if (lines.length === 0) return { success: false, error: 'empty' };

  // header detection (first non-empty line)
  const rawHeader = lines[0].split(',').map(h => h.trim().toLowerCase());
  const header = rawHeader.map(h => h.replace(/[^a-z0-9_]/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    // simple CSV split: trims each cell; not a full RFC4180 parser but sufficient for the fixtures
    const row = lines[i].split(',').map(s => s.trim());
    // Skip completely empty rows
    if (row.every(cell => cell === '')) continue;

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
      lithology: obj.lithology || '',
      // keep original row for debugging or downstream vector construction
      _raw: obj
    };
    records.push(normalized);
  }

  // The pipeline expects planarRecords in phase.planarRecords; return that shape
  return { success: true, data: { planarRecords: records } };
}

/**
 * Compatibility wrapper: parse(rawData)
 * - If rawData looks like CSV (contains newline or comma), tries parseCSV and returns its shape.
 * - If rawData is a JSON string, returns { success:true, data: parsed }.
 * - If rawData is already an object, returns { success:true, data: rawData }.
 * - Otherwise returns an error object.
 */
export function parse(rawData) {
  if (rawData === null || rawData === undefined) return { success: false, error: 'no_input' };

  // If string, detect whether it's CSV-like or JSON-like.
  if (typeof rawData === 'string') {
    const trimmed = rawData.trim();
    // Heuristic: if it contains a newline or a comma, treat as CSV first
    if (trimmed.includes('\n') || trimmed.includes(',')) {
      const csvRes = parseCSV(trimmed);
      // Return same shape as parseCSV
      return csvRes;
    }
    // Otherwise try JSON parse
    try {
      const parsed = JSON.parse(trimmed);
      return { success: true, data: parsed };
    } catch (e) {
      // fallback: try to parse as CSV anyway
      return parseCSV(trimmed);
    }
  }

  // If already an object, return it as data (legacy callers expect data to be an object)
  if (typeof rawData === 'object') {
    return { success: true, data: rawData };
  }

  return { success: false, error: 'unsupported_input_type' };
}

// default export for legacy callers who import default.parse(...)
export default { parse, parseCSV };
