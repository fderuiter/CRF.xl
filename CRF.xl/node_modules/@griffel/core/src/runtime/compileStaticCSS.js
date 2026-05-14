import { cssifyObject } from './utils/cssifyObject.js';
import { compileCSSRules } from './compileCSSRules.js';
export function compileStaticCSS(property, value) {
    const cssRule = `${property} {${cssifyObject(value)}}`;
    return compileCSSRules(cssRule, false)[0];
}
//# sourceMappingURL=compileStaticCSS.js.map