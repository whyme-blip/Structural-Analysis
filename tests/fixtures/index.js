/**
 * Deterministic validation fixtures baseline.
 * Provides frozen mock layouts for validation and guardrail checks.
 */
export const datasets = [
    { id: "ds_01_canonical", fabricCode: "FA-01", results: { confidence: { score: 0.85 } }, status: "active" },
    { id: "ds_02_withheld", fabricCode: "FA-02", results: { confidence: { score: 0.95 } }, status: "withheld" },
    { id: "ds_03_legacy", fabricCode: "FA-03", results: { confidence: { data: { score: 0.72 } } }, status: "active" }
];

export function getFixtures() { return datasets; }
export function loadFixtures() { return datasets; }

const fixturesBundle = Object.assign([...datasets], {
    datasets,
    getFixtures,
    loadFixtures
});

export default fixturesBundle;
