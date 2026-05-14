"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "resolveStyleRulesForSlots", {
    enumerable: true,
    get: function() {
        return resolveStyleRulesForSlots;
    }
});
const _resolveStyleRules = require("./runtime/resolveStyleRules.cjs");
function resolveStyleRulesForSlots(stylesBySlots, classNameHashSalt = '') {
    const classesMapBySlot = {};
    const cssRules = {};
    // eslint-disable-next-line guard-for-in
    for(const slotName in stylesBySlots){
        const slotStyles = stylesBySlots[slotName];
        const [cssClassMap, cssRulesByBucket] = (0, _resolveStyleRules.resolveStyleRules)(slotStyles, classNameHashSalt);
        classesMapBySlot[slotName] = cssClassMap;
        Object.keys(cssRulesByBucket).forEach((styleBucketName)=>{
            cssRules[styleBucketName] = (cssRules[styleBucketName] || []).concat(cssRulesByBucket[styleBucketName]);
        });
    }
    return [
        classesMapBySlot,
        cssRules
    ];
} //# sourceMappingURL=resolveStyleRulesForSlots.js.map
