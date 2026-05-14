"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__staticStyles", {
    enumerable: true,
    get: function() {
        return __staticStyles;
    }
});
const _insertionFactory = require("./insertionFactory.cjs");
function __staticStyles(cssRules, factory = _insertionFactory.insertionFactory) {
    const insertStyles = factory();
    function useStaticStyles(options) {
        insertStyles(options.renderer, cssRules);
    }
    return useStaticStyles;
} //# sourceMappingURL=__staticStyles.js.map
