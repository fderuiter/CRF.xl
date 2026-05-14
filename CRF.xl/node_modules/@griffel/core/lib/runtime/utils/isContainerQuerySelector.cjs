"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isContainerQuerySelector", {
    enumerable: true,
    get: function() {
        return isContainerQuerySelector;
    }
});
function isContainerQuerySelector(property) {
    return property.substring(0, 10) === '@container';
} //# sourceMappingURL=isContainerQuerySelector.js.map
