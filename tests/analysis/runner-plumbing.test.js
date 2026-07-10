const assert = require('assert');
const path = require('path');

// Dynamically resolve path to the confidence accessor utility
const accessorPath = path.resolve(__dirname, '../../src/utils/confidenceAccessor.js');

try {
    const getConfidenceScore = require(accessorPath);

    console.log('▶ Running Runner Plumbing Tests...');

    // Test Case 1: Canonical Flat Shape
    const canonicalPayload = { score: 0.85, status: 'stable' };
    assert.strictEqual(
        getConfidenceScore(canonicalPayload), 
        0.85, 
        'Failed to extract score from canonical flat object structure.'
    );

    // Test Case 2: Legacy Wrapped Shape
    const legacyPayload = { data: { score: 0.72 }, status: 'legacy' };
    assert.strictEqual(
        getConfidenceScore(legacyPayload), 
        0.72, 
        'Failed to extract score from legacy data wrapper structure.'
    );

    // Test Case 3: Edge Case / Missing Score Fallback
    const malformedPayload = { status: 'corrupted' };
    assert.strictEqual(
        getConfidenceScore(malformedPayload), 
        0.60, 
        'Failed to fallback to clamped 0.60 score when payload is malformed.'
    );

    console.log('✅ All runner plumbing tests passed successfully!\n');
} catch (error) {
    console.error('❌ Runner plumbing test execution failed:');
    console.error(error.stack);
    process.exit(1);
}
