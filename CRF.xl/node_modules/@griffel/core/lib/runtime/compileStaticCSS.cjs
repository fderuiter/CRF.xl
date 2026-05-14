"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "compileStaticCSS", {
    enumerable: true,
    get: function() {
        return compileStaticCSS;
    }
});
const _cssifyObject = require("./utils/cssifyObject.cjs");
const _compileCSSRules = require("./compileCSSRules.cjs");
function compileStaticCSS(property, value) {
    const cssRule = `${property} {${(0, _cssifyObject.cssifyObject)(value)}}`;
    return (0, _compileCSSRules.compileCSSRules)(cssRule, false)[0];
} //# sourceMappingURL=compileStaticCSS.js.map
