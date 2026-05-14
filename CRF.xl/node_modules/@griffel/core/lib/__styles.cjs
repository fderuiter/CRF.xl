"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__styles", {
    enumerable: true,
    get: function() {
        return __styles;
    }
});
const _index = require("./devtools/index.cjs");
const _insertionFactory = require("./insertionFactory.cjs");
const _reduceToClassNameForSlots = require("./runtime/reduceToClassNameForSlots.cjs");
function __styles(classesMapBySlot, cssRules, factory = _insertionFactory.insertionFactory) {
    const insertStyles = factory();
    let ltrClassNamesForSlots = null;
    let rtlClassNamesForSlots = null;
    let sourceURL;
    if (process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
        sourceURL = (0, _index.getSourceURLfromError)();
    }
    function computeClasses(options) {
        const { dir, renderer } = options;
        const isLTR = dir === 'ltr';
        if (isLTR) {
            if (ltrClassNamesForSlots === null) {
                ltrClassNamesForSlots = (0, _reduceToClassNameForSlots.reduceToClassNameForSlots)(classesMapBySlot, dir);
            }
        } else {
            if (rtlClassNamesForSlots === null) {
                rtlClassNamesForSlots = (0, _reduceToClassNameForSlots.reduceToClassNameForSlots)(classesMapBySlot, dir);
            }
        }
        insertStyles(renderer, cssRules);
        const classNamesForSlots = isLTR ? ltrClassNamesForSlots : rtlClassNamesForSlots;
        if (process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
            _index.debugData.addSequenceDetails(classNamesForSlots, sourceURL);
        }
        return classNamesForSlots;
    }
    return computeClasses;
} //# sourceMappingURL=__styles.js.map
