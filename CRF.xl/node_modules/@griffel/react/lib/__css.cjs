'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__css", {
    enumerable: true,
    get: function() {
        return __css;
    }
});
const _core = require("@griffel/core");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
function __css(classesMapBySlot) {
    const getStyles = (0, _core.__css)(classesMapBySlot);
    return function useClasses() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        return getStyles({
            dir
        });
    };
} //# sourceMappingURL=__css.js.map
