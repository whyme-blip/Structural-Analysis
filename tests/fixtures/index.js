/**
 * Deterministic validation fixtures baseline.
 * Implements a hybrid function-object pattern with native iterators
 * to support direct property access, factory invocation, and CSV generation.
 */
const mockRecords = [
    { id: "rec_01", type: "foliation", trend: 120, plunge: 45 },
    { id: "rec_02", type: "lineation", trend: 240, plunge: 15 }
];

const rawDatasets = [
    { id: "ds_01_canonical", fabricCode: "FA-01", results: { confidence: { score: 0.85 } }, status: "active" },
    { id: "ds_02_withheld", fabricCode: "FA-02", results: { confidence: { score: 0.95 } }, status: "withheld" },
    { id: "ds_03_legacy", fabricCode: "FA-03", results: { confidence: { data: { score: 0.72 } } }, status: "active" }
];

// Map each item into a callable function that holds data arrays and implements an iterator
const hybridDatasets = rawDatasets.map(item => {
    const baseItem = {
        ...item,
        records: mockRecords,
        data: mockRecords,
        // Guarantees the object itself can be looped over directly via for...of
        [Symbol.iterator]: function* () {
            for (const rec of mockRecords) yield rec;
        }
    };
    const itemLoader = () => baseItem;
    Object.assign(itemLoader, baseItem);
    return itemLoader;
});

// Proxy wrapper ensures lookups work via numeric indices or string IDs
export const DATASETS = new Proxy(hybridDatasets, {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        const found = target.find(item => item.id === prop);
        if (found) return found;
        
        // Safe fallback function matching the hybrid signature
        const fallbackItem = {
            id: String(prop),
            results: { confidence: { score: 0.5 } },
            records: mockRecords,
            data: mockRecords,
            [Symbol.iterator]: function* () {
                for (const rec of mockRecords) yield rec;
            }
        };
        const fallback = () => fallbackItem;
        Object.assign(fallback, fallbackItem);
        return fallback;
    }
});

export const datasets = DATASETS;

export function getFixtures() { return hybridDatasets; }
export function loadFixtures() { return hybridDatasets; }

const fixturesBundle = Object.assign([...hybridDatasets], {
    datasets,
    DATASETS,
    getFixtures,
    loadFixtures
});

export default fixturesBundle;
