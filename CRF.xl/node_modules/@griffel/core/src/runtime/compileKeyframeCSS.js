import { compile, middleware, serialize, rulesheet, stringify } from 'stylis';
import { prefixerPlugin } from './stylis/prefixerPlugin.js';
import { cssifyObject } from './utils/cssifyObject.js';
export function compileKeyframeRule(keyframeObject) {
    let css = '';
    // eslint-disable-next-line guard-for-in
    for (const percentage in keyframeObject) {
        css += `${percentage}{${cssifyObject(keyframeObject[percentage])}}`;
    }
    return css;
}
/**
 * Creates CSS rules for insertion from passed CSS.
 */
export function compileKeyframesCSS(keyframeName, keyframeCSS) {
    const cssRule = `@keyframes ${keyframeName} {${keyframeCSS}}`;
    const rules = [];
    serialize(compile(cssRule), middleware([
        stringify,
        prefixerPlugin,
        // 💡 we are using `.insertRule()` API for DOM operations, which does not support
        // insertion of multiple CSS rules in a single call. `rulesheet` plugin extracts
        // individual rules to be used with this API
        rulesheet(rule => rules.push(rule)),
    ]));
    return rules;
}
//# sourceMappingURL=compileKeyframeCSS.js.map