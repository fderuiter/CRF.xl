'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__styles", {
    enumerable: true,
    get: function() {
        return __styles;
    }
});
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
function __styles(classesMapBySlot, cssRules) {
    const getStyles = (0, _core.__styles)(classesMapBySlot, cssRules, _insertionFactory.insertionFactory);
    return function useClasses() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        const renderer = (0, _RendererContext.useRenderer)();
        return getStyles({
            dir,
            renderer
        });
    };
} //# sourceMappingURL=__styles.js.map
