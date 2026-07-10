/**
 * Safe baseline stub for the missing math utility.
 * Prevents static import linking errors during core calculations.
 */
export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

export function sum(arr = []) {
    return arr.reduce((a, b) => a + b, 0);
}

export function mean(arr = []) {
    return arr.length ? sum(arr) / arr.length : 0;
}

export function dot(a = [], b = []) {
    return a.reduce((acc, val, i) => acc + (val * (b[i] || 0)), 0);
}

const mathEngine = {
    clamp,
    sum,
    mean,
    dot
};

export default mathEngine;
