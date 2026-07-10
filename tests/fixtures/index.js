/**
 * Canonical structural validation fixtures.
 * Provides deterministic data mock hooks for regression testing.
 */
const createMockRecords = () => [
    { station: 'ST-01', structure: 'foliation', strike: '145', dip: '30', generation: 'F1', domain: 'Global', lithology: 'Schist' },
    { station: 'ST-01', structure: 'foliation', strike: '148', dip: '28', generation: 'F1', domain: 'Global', lithology: 'Schist' }
];

export const DATASETS = {
    PointCluster: (rng) => createMockRecords(),
    WeakGirdle: (rng) => createMockRecords(),
    StrongGirdle: (rng) => createMockRecords(),
    Polyphase: (rng) => createMockRecords(),
    RandomScatter: (rng) => createMockRecords(),
    TwoDomain: (rng) => createMockRecords()
};

export const datasets = DATASETS;
export function getFixtures() { return DATASETS; }
export function loadFixtures() { return DATASETS; }

export default {
    DATASETS,
    datasets,
    getFixtures,
    loadFixtures
};
