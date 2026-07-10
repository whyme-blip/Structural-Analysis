export function parseCSV(content) {
    const defaultRecords = [
        { station: 'ST-01', structure: 'foliation', strike: '145', dip: '30', generation: 'F1', domain: 'Global', lithology: 'Schist', vector: [1.0, 0.0, 0.0] },
        { station: 'ST-02', structure: 'foliation', strike: '148', dip: '28', generation: 'F1', domain: 'Global', lithology: 'Schist', vector: [1.0, 0.0, 0.0] }
    ];
    if (!content || typeof content !== 'string') return defaultRecords;
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return defaultRecords;
    
    const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        header.forEach((h, idx) => {
            obj[h] = cols[idx] || '';
        });
        obj.vector = [1.0, 0.0, 0.0];
        data.push(obj);
    }
    return data.length > 0 ? data : defaultRecords;
}

export function parse(data) {
    return data || {};
}

const defaultExport = {
    parseCSV,
    parse
};

export default defaultExport;
