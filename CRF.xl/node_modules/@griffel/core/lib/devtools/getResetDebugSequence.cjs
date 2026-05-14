"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getResetDebugSequence", {
    enumerable: true,
    get: function() {
        return getResetDebugSequence;
    }
});
const _constants = require("../constants.cjs");
const _store = require("./store.cjs");
function getResetDebugSequence(debugSequenceHash) {
    const resetClass = _constants.DEBUG_RESET_CLASSES[debugSequenceHash];
    if (resetClass === undefined) {
        return undefined;
    }
    const debugClassNames = [
        {
            className: debugSequenceHash
        }
    ];
    const node = {
        sequenceHash: debugSequenceHash,
        direction: 'ltr',
        children: [],
        debugClassNames
    };
    node.rules = {};
    node.slot = 'makeResetStyles()';
    const [{ className }] = node.debugClassNames;
    const cssRules = _store.debugData.getCSSRules().filter((cssRule)=>{
        return cssRule.includes(`.${className}`);
    });
    node.rules[className] = cssRules.join('');
    return node;
} //# sourceMappingURL=getResetDebugSequence.js.map
