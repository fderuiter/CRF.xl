"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isSupportQuerySelector", {
    enumerable: true,
    get: function() {
        return isSupportQuerySelector;
    }
});
function isSupportQuerySelector(property) {
    return property.substr(0, 9) === '@supports';
} //# sourceMappingURL=isSupportQuerySelector.js.map
