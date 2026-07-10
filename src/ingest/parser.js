/**
 * Safe baseline stub for the missing ingest parser.
 * This prevents the validation script from crashing on boot.
 */
export function parse(rawData) {
    if (!rawData) return {};
    try {
        return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch (e) {
        return {};
    }
}

export default {
    parse
};
