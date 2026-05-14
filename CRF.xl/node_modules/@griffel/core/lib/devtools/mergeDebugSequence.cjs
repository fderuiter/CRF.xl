"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "mergeDebugSequence", {
    enumerable: true,
    get: function() {
        return mergeDebugSequence;
    }
});
const _getAtomicDebugSequenceTree = require("./getAtomicDebugSequenceTree.cjs");
const _getResetDebugSequence = require("./getResetDebugSequence.cjs");
function mergeDebugSequence(atomicClases, resetClassName) {
    const debugResultRootAtomic = atomicClases ? (0, _getAtomicDebugSequenceTree.getAtomicDebugSequenceTree)(atomicClases) : undefined;
    const debugResultRootReset = resetClassName ? (0, _getResetDebugSequence.getResetDebugSequence)(resetClassName) : undefined;
    if (!debugResultRootAtomic && !debugResultRootReset) {
        return undefined;
    }
    if (!debugResultRootAtomic) {
        return debugResultRootReset;
    }
    if (!debugResultRootReset) {
        return debugResultRootAtomic;
    }
    const debugResultRoot = {
        sequenceHash: debugResultRootAtomic.sequenceHash + debugResultRootReset.sequenceHash,
        direction: debugResultRootAtomic.direction,
        children: [
            debugResultRootAtomic,
            debugResultRootReset
        ],
        debugClassNames: [
            ...debugResultRootAtomic.debugClassNames,
            ...debugResultRootReset.debugClassNames
        ]
    };
    return debugResultRoot;
} //# sourceMappingURL=mergeDebugSequence.js.map
