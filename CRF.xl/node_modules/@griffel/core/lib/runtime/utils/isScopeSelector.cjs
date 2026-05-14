"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isScopeSelector", {
    enumerable: true,
    get: function() {
        return isScopeSelector;
    }
});
function isScopeSelector(property) {
    return property.substring(0, 6) === '@scope';
} //# sourceMappingURL=isScopeSelector.js.map
