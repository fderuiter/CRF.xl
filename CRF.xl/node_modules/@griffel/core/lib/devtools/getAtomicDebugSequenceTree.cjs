"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getAtomicDebugSequenceTree", {
    enumerable: true,
    get: function() {
        return getAtomicDebugSequenceTree;
    }
});
const _constants = require("../constants.cjs");
const _store = require("./store.cjs");
const _utils = require("./utils.cjs");
function getAtomicDebugSequenceTree(debugSequenceHash, parentNode) {
    const lookupItem = _constants.DEFINITION_LOOKUP_TABLE[debugSequenceHash];
    if (lookupItem === undefined) {
        return undefined;
    }
    const parentLookupItem = parentNode ? _constants.DEFINITION_LOOKUP_TABLE[parentNode.sequenceHash] : undefined;
    const debugClassNames = (0, _utils.getDebugClassNames)(lookupItem, parentLookupItem, parentNode === null || parentNode === void 0 ? void 0 : parentNode.debugClassNames, parentNode === null || parentNode === void 0 ? void 0 : parentNode.children);
    const node = {
        sequenceHash: debugSequenceHash,
        direction: lookupItem[1],
        children: [],
        debugClassNames
    };
    const childrenSequences = _store.debugData.getChildrenSequences(node.sequenceHash);
    childrenSequences.reverse() // first process the overriding children that are merged last
    .forEach((sequence)=>{
        const child = getAtomicDebugSequenceTree(sequence, node);
        if (child) {
            node.children.push(child);
        }
    });
    // if it's leaf (makeStyle node), get css rules
    if (!node.children.length) {
        node.rules = {};
        node.debugClassNames.forEach(({ className })=>{
            const mapData = _store.debugData.getSequenceDetails(debugSequenceHash);
            if (mapData) {
                node.slot = mapData.slotName;
                node.sourceURL = mapData.sourceURL;
            }
            const cssRule = _store.debugData.getCSSRules().find((cssRule)=>{
                return cssRule.includes(className);
            });
            node.rules[className] = cssRule;
        });
    }
    return node;
} //# sourceMappingURL=getAtomicDebugSequenceTree.js.map
