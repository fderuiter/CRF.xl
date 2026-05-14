'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "makeResetStyles", {
    enumerable: true,
    get: function() {
        return makeResetStyles;
    }
});
const _core = require("@griffel/core");
const _insertionFactory = require("./insertionFactory.cjs");
const _RendererContext = require("./RendererContext.cjs");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
const _isInsideComponent = require("./utils/isInsideComponent.cjs");
function makeResetStyles(styles) {
    const getStyles = (0, _core.makeResetStyles)(styles, _insertionFactory.insertionFactory);
    if (process.env.NODE_ENV !== 'production') {
        if ((0, _isInsideComponent.isInsideComponent)()) {
            throw new Error([
                "makeResetStyles(): this function cannot be called in component's scope.",
                'All makeResetStyles() calls should be top level i.e. in a root scope of a file.'
            ].join(' '));
        }
    }
    return function useClassName() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        const renderer = (0, _RendererContext.useRenderer)();
        return getStyles({
            dir,
            renderer
        });
    };
} //# sourceMappingURL=makeResetStyles.js.map
