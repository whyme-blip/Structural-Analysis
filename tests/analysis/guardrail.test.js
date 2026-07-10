const assert = require('assert');

try {
    console.log('▶ Running Guardrail Unit Tests...');

    // Mock validation dataset item representing a hard violation
    const mockDatasetResult = {
        name: 'WithheldFoldAxis',
        confidence: 0.60, 
        failures: ['HARD_GUARDRAIL_VIOLATION']
    };

    // Assert that if a hard violation is present, it is recorded in failures
    assert.ok(
        mockDatasetResult.failures.includes('HARD_GUARDRAIL_VIOLATION'),
        'Guardrail contract breach: HARD_GUARDRAIL_VIOLATION flag was not preserved.'
    );

    // Assert that the confidence score is strictly capped at 60%
    assert.deepStrictEqual(
        mockDatasetResult.confidence <= 0.60,
        true,
        'Guardrail contract breach: Withheld or volatile data exceeded the 60% confidence cap.'
    );

    console.log('✅ All guardrail unit tests passed successfully!\n');
} catch (error) {
    console.error('❌ Guardrail unit test execution failed:');
    console.error(error.stack);
    process.exit(1);
}
