const createMockRecords = () => [
    { station: 'ST-01', structure: 'foliation', strike: '145', dip: '30', generation: 'F1', domain: 'Global', lithology: 'Schist' },
    { station: 'ST-02', structure: 'foliation', strike: '148', dip: '28', generation: 'F1', domain: 'Global', lithology: 'Schist' }
];

export const DATASETS = {
    PointCluster: () => createMockRecords(),
    WeakGirdle: () => createMockRecords(),
    StrongGirdle: () => createMockRecords(),
    Polyphase: () => createMockRecords(),
    RandomScatter: () => createMockRecords(),
    TwoDomain: () => createMockRecords()
};

export const datasets = DATASETS;
export function getFixtures() { return DATASETS; }
export function loadFixtures() { return DATASETS; }

const defaultExport = {
    DATASETS,
    datasets,
    getFixtures,
    loadFixtures
};

export default defaultExport;
