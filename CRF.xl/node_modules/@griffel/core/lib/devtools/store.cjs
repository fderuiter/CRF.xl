"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "debugData", {
    enumerable: true,
    get: function() {
        return debugData;
    }
});
const _constants = require("../constants.cjs");
const _mergeClasses = require("../mergeClasses.cjs");
const sequenceDetails = {};
const cssRules = new Set();
const debugData = {
    getChildrenSequences: (debugSequenceHash)=>{
        const key = Object.keys(_mergeClasses.mergeClassesCachedResults).find((key)=>_mergeClasses.mergeClassesCachedResults[key].startsWith(debugSequenceHash));
        if (key) {
            // key of the mergeClasses cache contains merge order
            return key.split(_constants.SEQUENCE_PREFIX).filter((sequence)=>sequence.length).map((sequence)=>_constants.SEQUENCE_PREFIX + sequence);
        }
        return [];
    },
    addCSSRule: (rule)=>{
        cssRules.add(rule);
    },
    addSequenceDetails: (classNamesForSlots, sourceURL)=>{
        Object.entries(classNamesForSlots).forEach(([slotName, sequenceHash])=>{
            sequenceDetails[sequenceHash.substring(0, _constants.SEQUENCE_SIZE)] = {
                slotName,
                sourceURL
            };
        });
    },
    getCSSRules: ()=>{
        return Array.from(cssRules);
    },
    getSequenceDetails: (sequenceHash)=>{
        return sequenceDetails[sequenceHash];
    }
}; //# sourceMappingURL=store.js.map
