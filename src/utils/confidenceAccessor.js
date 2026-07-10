/**
 * Safely extracts confidence scores from both flat and legacy wrapped data payloads.
 */
function getConfidenceScore(payload) {
    if (!payload) return 0.60;

    // 1. Check canonical flat shape: { score: 0.85 }
    if (typeof payload.score === 'number') {
        return payload.score;
    }

    // 2. Check legacy wrapped shape: { data: { score: 0.72 } }
    if (payload.data && typeof payload.data.score === 'number') {
        return payload.data.score;
    }

    // 3. Fallback default if score is missing or malformed
    return 0.60;
}

module.exports = getConfidenceScore;
