"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "sortClassesInAtRulesPlugin", {
    enumerable: true,
    get: function() {
        return sortClassesInAtRulesPlugin;
    }
});
const _isAtRuleElement = require("./isAtRuleElement.cjs");
const sortClassesInAtRulesPlugin = (element)=>{
    if ((0, _isAtRuleElement.isAtRuleElement)(element) && Array.isArray(element.children)) {
        element.children.sort((a, b)=>a.props[0] > b.props[0] ? 1 : -1);
    }
}; //# sourceMappingURL=sortClassesInAtRulesPlugin.js.map
