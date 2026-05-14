"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get compileKeyframeRule () {
        return compileKeyframeRule;
    },
    get compileKeyframesCSS () {
        return compileKeyframesCSS;
    }
});
const _stylis = require("stylis");
const _prefixerPlugin = require("./stylis/prefixerPlugin.cjs");
const _cssifyObject = require("./utils/cssifyObject.cjs");
function compileKeyframeRule(keyframeObject) {
    let css = '';
    // eslint-disable-next-line guard-for-in
    for(const percentage in keyframeObject){
        css += `${percentage}{${(0, _cssifyObject.cssifyObject)(keyframeObject[percentage])}}`;
    }
    return css;
}
function compileKeyframesCSS(keyframeName, keyframeCSS) {
    const cssRule = `@keyframes ${keyframeName} {${keyframeCSS}}`;
    const rules = [];
    (0, _stylis.serialize)((0, _stylis.compile)(cssRule), (0, _stylis.middleware)([
        _stylis.stringify,
        _prefixerPlugin.prefixerPlugin,
        // 💡 we are using `.insertRule()` API for DOM operations, which does not support
        // insertion of multiple CSS rules in a single call. `rulesheet` plugin extracts
        // individual rules to be used with this API
        (0, _stylis.rulesheet)((rule)=>rules.push(rule))
    ]));
    return rules;
} //# sourceMappingURL=compileKeyframeCSS.js.map
