"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "makeStaticStyles", {
    enumerable: true,
    get: function() {
        return makeStaticStyles;
    }
});
const _insertionFactory = require("./insertionFactory.cjs");
const _resolveStaticStyleRules = require("./runtime/resolveStaticStyleRules.cjs");
function makeStaticStyles(styles, factory = _insertionFactory.insertionFactory) {
    const insertStyles = factory();
    const stylesSet = Array.isArray(styles) ? styles : [
        styles
    ];
    function useStaticStyles(options) {
        insertStyles(options.renderer, // 👇 static rules should be inserted into default bucket
        {
            d: (0, _resolveStaticStyleRules.resolveStaticStyleRules)(stylesSet)
        });
    }
    return useStaticStyles;
} //# sourceMappingURL=makeStaticStyles.js.map
