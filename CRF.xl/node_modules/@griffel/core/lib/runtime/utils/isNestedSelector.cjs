"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isNestedSelector", {
    enumerable: true,
    get: function() {
        return isNestedSelector;
    }
});
const regex = /^(:|\[|>|&)/;
function isNestedSelector(property) {
    return regex.test(property);
} //# sourceMappingURL=isNestedSelector.js.map
