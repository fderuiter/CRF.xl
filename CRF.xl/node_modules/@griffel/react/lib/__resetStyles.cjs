'use client';
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
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
function __resetStyles(ltrClassName, rtlClassName, cssRules) {
    const getStyles = (0, _core.__resetStyles)(ltrClassName, rtlClassName, cssRules, _insertionFactory.insertionFactory);
    return function useClasses() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        const renderer = (0, _RendererContext.useRenderer)();
        return getStyles({
            dir,
            renderer
        });
    };
} //# sourceMappingURL=__resetStyles.js.map
