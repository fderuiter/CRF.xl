'use client';
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
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
function makeStaticStyles(styles) {
    const getStyles = (0, _core.makeStaticStyles)(styles, _insertionFactory.insertionFactory);
    if (process.env.NODE_ENV === 'test') {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return ()=>{};
    }
    return function useStaticStyles() {
        const renderer = (0, _RendererContext.useRenderer)();
        const options = {
            renderer
        };
        return getStyles(options);
    };
} //# sourceMappingURL=makeStaticStyles.js.map
