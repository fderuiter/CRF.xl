"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isBorderStyle", {
    enumerable: true,
    get: function() {
        return isBorderStyle;
    }
});
const LINE_STYLES = [
    'none',
    'hidden',
    'dotted',
    'dashed',
    'solid',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset'
];
function isBorderStyle(value) {
    return LINE_STYLES.includes(value);
} //# sourceMappingURL=utils.js.map
