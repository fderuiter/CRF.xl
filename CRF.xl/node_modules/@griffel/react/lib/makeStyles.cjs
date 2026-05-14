'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "makeStyles", {
    enumerable: true,
    get: function() {
        return makeStyles;
    }
});
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
const _isInsideComponent = require("./utils/isInsideComponent.cjs");
function makeStyles(stylesBySlots) {
    const getStyles = (0, _core.makeStyles)(stylesBySlots, _insertionFactory.insertionFactory);
    if (process.env.NODE_ENV !== 'production') {
        if ((0, _isInsideComponent.isInsideComponent)()) {
            throw new Error([
                "makeStyles(): this function cannot be called in component's scope.",
                'All makeStyles() calls should be top level i.e. in a root scope of a file.'
            ].join(' '));
        }
    }
    return function useClasses() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        const renderer = (0, _RendererContext.useRenderer)();
        return getStyles({
            dir,
            renderer
        });
    };
} //# sourceMappingURL=makeStyles.js.map
