"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isLayerSelector", {
    enumerable: true,
    get: function() {
        return isLayerSelector;
    }
});
function isLayerSelector(property) {
    return property.substr(0, 6) === '@layer';
} //# sourceMappingURL=isLayerSelector.js.map
