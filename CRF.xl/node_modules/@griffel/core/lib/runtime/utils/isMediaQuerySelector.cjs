"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isMediaQuerySelector", {
    enumerable: true,
    get: function() {
        return isMediaQuerySelector;
    }
});
function isMediaQuerySelector(property) {
    return property.substr(0, 6) === '@media';
} //# sourceMappingURL=isMediaQuerySelector.js.map
