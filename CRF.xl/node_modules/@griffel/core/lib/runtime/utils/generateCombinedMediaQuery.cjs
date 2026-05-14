"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "generateCombinedQuery", {
    enumerable: true,
    get: function() {
        return generateCombinedQuery;
    }
});
function generateCombinedQuery(currentMediaQuery, nestedMediaQuery) {
    if (currentMediaQuery.length === 0) {
        return nestedMediaQuery;
    }
    return `${currentMediaQuery} and ${nestedMediaQuery}`;
} //# sourceMappingURL=generateCombinedMediaQuery.js.map
