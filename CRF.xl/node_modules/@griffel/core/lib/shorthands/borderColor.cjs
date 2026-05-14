"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderColor", {
    enumerable: true,
    get: function() {
        return borderColor;
    }
});
const _generateStyles = require("./generateStyles.cjs");
function borderColor(...values) {
    return (0, _generateStyles.generateStyles)('border', 'Color', ...values);
} //# sourceMappingURL=borderColor.js.map
