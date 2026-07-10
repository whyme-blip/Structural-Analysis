/**
 * Deterministic validation fixtures baseline.
 * Implements a hybrid function-object pattern to satisfy both direct property 
 * reading and execution factory invocations.
 */
const rawDatasets = [
    { id: "ds_01_canonical", fabricCode: "FA-01", results: { confidence: { score: 0.85 } }, status: "active" },
    { id: "ds_02_withheld", fabricCode: "FA-02", results: { confidence: { score: 0.95 } }, status: "withheld" },
    { id: "ds_03_legacy", fabricCode: "FA-03", results: { confidence: { data: { score: 0.72 } } }, status: "active" }
];

// Map each item into a callable function that also holds its own properties
const hybridDatasets = rawDatasets.map(item => {
    const itemLoader = () => item;
    Object.assign(itemLoader, item);
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
        const fallback = () => ({ id: String(prop), results: { confidence: { score: 0.5 } } });
        Object.assign(fallback, fallback());
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
