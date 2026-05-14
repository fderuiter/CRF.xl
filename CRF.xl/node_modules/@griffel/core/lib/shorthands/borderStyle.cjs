"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderStyle", {
    enumerable: true,
    get: function() {
        return borderStyle;
    }
});
const _generateStyles = require("./generateStyles.cjs");
function borderStyle(...values) {
    return (0, _generateStyles.generateStyles)('border', 'Style', ...values);
} //# sourceMappingURL=borderStyle.js.map
