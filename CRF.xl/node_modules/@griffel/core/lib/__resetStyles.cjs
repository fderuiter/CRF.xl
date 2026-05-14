"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__resetStyles", {
    enumerable: true,
    get: function() {
        return __resetStyles;
    }
});
const _constants = require("./constants.cjs");
const _insertionFactory = require("./insertionFactory.cjs");
function __resetStyles(ltrClassName, rtlClassName, cssRules, factory = _insertionFactory.insertionFactory) {
    const insertStyles = factory();
    function computeClassName(options) {
        const { dir, renderer } = options;
        const className = dir === 'ltr' ? ltrClassName : rtlClassName || ltrClassName;
        insertStyles(renderer, Array.isArray(cssRules) ? {
            r: cssRules
        } : cssRules);
        if (process.env.NODE_ENV !== 'production') {
            _constants.DEBUG_RESET_CLASSES[className] = 1;
        }
        return className;
    }
    return computeClassName;
} //# sourceMappingURL=__resetStyles.js.map
