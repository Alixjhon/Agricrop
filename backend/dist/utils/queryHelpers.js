"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumber = toNumber;
function toNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}
//# sourceMappingURL=queryHelpers.js.map