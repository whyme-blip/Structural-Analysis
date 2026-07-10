/**
 * Ingestion parser utility.
 * Parses raw validation CSV inputs into structured data frames.
 */
export function parseCSV(content) {
    if (!content) return [];
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    
    const header = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const obj = {};
        header.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
        });
        obj.vector = [1.0, 0.0, 0.0];
        data.push(obj);
    }
    return data;
}

export function parse(data) {
    return data || {};
}

export default {
    parseCSV,
    parse
};
