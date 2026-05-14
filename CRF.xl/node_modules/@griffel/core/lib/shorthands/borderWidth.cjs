"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderWidth", {
    enumerable: true,
    get: function() {
        return borderWidth;
    }
});
const _generateStyles = require("./generateStyles.cjs");
function borderWidth(...values) {
    return (0, _generateStyles.generateStyles)('border', 'Width', ...values);
} //# sourceMappingURL=borderWidth.js.map
