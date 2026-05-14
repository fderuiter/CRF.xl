"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "padding", {
    enumerable: true,
    get: function() {
        return padding;
    }
});
const _generateStyles = require("./generateStyles.cjs");
function padding(...values) {
    return (0, _generateStyles.generateStyles)('padding', '', ...values);
} //# sourceMappingURL=padding.js.map
