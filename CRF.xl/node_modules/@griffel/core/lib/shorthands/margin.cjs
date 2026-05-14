"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "margin", {
    enumerable: true,
    get: function() {
        return margin;
    }
});
const _generateStyles = require("./generateStyles.cjs");
function margin(...values) {
    return (0, _generateStyles.generateStyles)('margin', '', ...values);
} //# sourceMappingURL=margin.js.map
