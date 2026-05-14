'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__resetCSS", {
    enumerable: true,
    get: function() {
        return __resetCSS;
    }
});
const _core = require("@griffel/core");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
function __resetCSS(ltrClassName, rtlClassName) {
    const getStyles = (0, _core.__resetCSS)(ltrClassName, rtlClassName);
    return function useClasses() {
        const dir = (0, _TextDirectionContext.useTextDirection)();
        return getStyles({
            dir
        });
    };
} //# sourceMappingURL=__resetCSS.js.map
