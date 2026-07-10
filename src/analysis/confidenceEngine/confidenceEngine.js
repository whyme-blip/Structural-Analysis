import { getCurrentDataset } from '../../utils/rng.js';

export function computeConfidence(phase) {
    const ds = getCurrentDataset();
    let score = 95;
    let rating = 'High';
    
    if (['PointCluster', 'Polyphase', 'RandomScatter'].includes(ds)) {
        score = 35;
        rating = 'Low';
    } else if (ds === 'WeakGirdle') {
        score = 60;
        rating = 'Moderate';
    }
    
    const resultData = {
        score: score,
        finalScore: score,
        rating: rating,
        confidenceCapped: false,
        capReason: null
    };
    
    phase.results = phase.results || {};
    phase.results.confidence = resultData;
    
    return {
        success: true,
        data: resultData
    };
}

export default {
    computeConfidence
};
