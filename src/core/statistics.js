/**
 * Safe baseline stub for the missing statistics utility.
 * Prevents static import linking errors during metric profiling.
 */
export function variance(arr = []) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
}

export function stdDev(arr = []) {
    return Math.sqrt(variance(arr));
}

export function median(arr = []) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function min(arr = []) { return arr.length ? Math.min(...arr) : 0; }
export function max(arr = []) { return arr.length ? Math.max(...arr) : 0; }

const statisticsEngine = {
    variance,
    stdDev,
    median,
    min,
    max
};

export default statisticsEngine;
