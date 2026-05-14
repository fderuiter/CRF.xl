'use client';
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
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
function __staticStyles(cssRules) {
    const getStyles = (0, _core.__staticStyles)(cssRules, _insertionFactory.insertionFactory);
    return function useStaticStyles() {
        const renderer = (0, _RendererContext.useRenderer)();
        return getStyles({
            renderer
        });
    };
} //# sourceMappingURL=__staticStyles.js.map
