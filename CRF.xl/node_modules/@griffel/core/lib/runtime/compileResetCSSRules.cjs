"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "compileResetCSSRules", {
    enumerable: true,
    get: function() {
        return compileResetCSSRules;
    }
});
const _stylis = require("stylis");
const _globalPlugin = require("./stylis/globalPlugin.cjs");
const _isAtRuleElement = require("./stylis/isAtRuleElement.cjs");
const _prefixerPlugin = require("./stylis/prefixerPlugin.cjs");
const _rulesheetPlugin = require("./stylis/rulesheetPlugin.cjs");
const _scopePlugin = require("./stylis/scopePlugin.cjs");
function compileResetCSSRules(className, body) {
    const rules = [];
    const atRules = [];
    (0, _stylis.serialize)((0, _stylis.compile)(`.${className}{${body}}`), (0, _stylis.middleware)([
        (0, _scopePlugin.scopePlugin)(`.${className}`),
        _globalPlugin.globalPlugin,
        _prefixerPlugin.prefixerPlugin,
        _stylis.stringify,
        // 💡 we are using `.insertRule()` API for DOM operations, which does not support
        // insertion of multiple CSS rules in a single call. `rulesheet` plugin extracts
        // individual rules to be used with this API
        (0, _rulesheetPlugin.rulesheetPlugin)((element, rule)=>{
            if ((0, _isAtRuleElement.isAtRuleElement)(element)) {
                atRules.push(rule);
                return;
            }
            rules.push(rule);
        })
    ]));
    return [
        rules,
        atRules
    ];
} //# sourceMappingURL=compileResetCSSRules.js.map
