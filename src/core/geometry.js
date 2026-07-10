/**
 * Safe baseline stub for the missing geometry module.
 * Prevents static import linking errors during runner compilation.
 */
export function validateGeometry(data) {
    return { valid: true, errors: [] };
}

export function getBounds(data) {
    return { x: 0, y: 0, width: 1, height: 1 };
}

const geometryEngine = {
    validateGeometry,
    getBounds
};

export default geometryEngine;
