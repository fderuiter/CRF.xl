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
const _constants = require("./constants.cjs");
function __resetCSS(ltrClassName, rtlClassName) {
    function computeClassName(options) {
        const { dir } = options;
        const className = dir === 'ltr' ? ltrClassName : rtlClassName || ltrClassName;
        if (process.env.NODE_ENV !== 'production') {
            _constants.DEBUG_RESET_CLASSES[className] = 1;
        }
        return className;
    }
    return computeClassName;
} //# sourceMappingURL=__resetCSS.js.map
