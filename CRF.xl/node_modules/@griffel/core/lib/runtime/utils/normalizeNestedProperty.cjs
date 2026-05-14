"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "normalizeNestedProperty", {
    enumerable: true,
    get: function() {
        return normalizeNestedProperty;
    }
});
function normalizeNestedProperty(nestedProperty) {
    if (nestedProperty.charAt(0) === '&') {
        return nestedProperty.slice(1);
    }
    return nestedProperty;
} //# sourceMappingURL=normalizeNestedProperty.js.map
