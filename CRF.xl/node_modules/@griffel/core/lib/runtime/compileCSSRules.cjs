"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "compileCSSRules", {
    enumerable: true,
    get: function() {
        return compileCSSRules;
    }
});
const _stylis = require("stylis");
const _globalPlugin = require("./stylis/globalPlugin.cjs");
const _prefixerPlugin = require("./stylis/prefixerPlugin.cjs");
const _sortClassesInAtRulesPlugin = require("./stylis/sortClassesInAtRulesPlugin.cjs");
// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}
function compileCSSRules(cssRules, sortClassesInAtRules) {
    const rules = [];
    (0, _stylis.serialize)((0, _stylis.compile)(cssRules), (0, _stylis.middleware)([
        _globalPlugin.globalPlugin,
        sortClassesInAtRules ? _sortClassesInAtRulesPlugin.sortClassesInAtRulesPlugin : noop,
        _prefixerPlugin.prefixerPlugin,
        _stylis.stringify,
        // 💡 we are using `.insertRule()` API for DOM operations, which does not support
        // insertion of multiple CSS rules in a single call. `rulesheet` plugin extracts
        // individual rules to be used with this API
        (0, _stylis.rulesheet)((rule)=>rules.push(rule))
    ]));
    return rules;
} //# sourceMappingURL=compileCSSRules.js.map
