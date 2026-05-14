"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "resolveStaticStyleRules", {
    enumerable: true,
    get: function() {
        return resolveStaticStyleRules;
    }
});
const _compileCSSRules = require("./compileCSSRules.cjs");
const _compileStaticCSS = require("./compileStaticCSS.cjs");
function resolveStaticStyleRules(stylesSet) {
    return stylesSet.reduce((acc, styles)=>{
        if (typeof styles === 'string') {
            const cssRules = (0, _compileCSSRules.compileCSSRules)(styles, false);
            for (const rule of cssRules){
                acc.push(rule);
            }
            return acc;
        }
        // eslint-disable-next-line guard-for-in
        for(const property in styles){
            const value = styles[property];
            const staticCSS = (0, _compileStaticCSS.compileStaticCSS)(property, value);
            acc.push(staticCSS);
        }
        return acc;
    }, []);
} //# sourceMappingURL=resolveStaticStyleRules.js.map
