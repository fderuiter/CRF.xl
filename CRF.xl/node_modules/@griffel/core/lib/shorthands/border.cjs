"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "border", {
    enumerable: true,
    get: function() {
        return border;
    }
});
const _borderWidth = require("./borderWidth.cjs");
const _borderStyle = require("./borderStyle.cjs");
const _borderColor = require("./borderColor.cjs");
const _utils = require("./utils.cjs");
function border(...values) {
    if ((0, _utils.isBorderStyle)(values[0])) {
        return {
            ...(0, _borderStyle.borderStyle)(values[0]),
            ...values[1] && (0, _borderWidth.borderWidth)(values[1]),
            ...values[2] && (0, _borderColor.borderColor)(values[2])
        };
    }
    return {
        ...(0, _borderWidth.borderWidth)(values[0]),
        ...values[1] && (0, _borderStyle.borderStyle)(values[1]),
        ...values[2] && (0, _borderColor.borderColor)(values[2])
    };
} //# sourceMappingURL=border.js.map
