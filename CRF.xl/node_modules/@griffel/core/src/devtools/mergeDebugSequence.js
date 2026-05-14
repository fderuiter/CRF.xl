import { getAtomicDebugSequenceTree } from './getAtomicDebugSequenceTree.js';
import { getResetDebugSequence } from './getResetDebugSequence.js';
export function mergeDebugSequence(atomicClases, resetClassName) {
    const debugResultRootAtomic = atomicClases ? getAtomicDebugSequenceTree(atomicClases) : undefined;
    const debugResultRootReset = resetClassName ? getResetDebugSequence(resetClassName) : undefined;
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
        children: [debugResultRootAtomic, debugResultRootReset],
        debugClassNames: [...debugResultRootAtomic.debugClassNames, ...debugResultRootReset.debugClassNames],
    };
    return debugResultRoot;
}
//# sourceMappingURL=mergeDebugSequence.js.map