"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "__css", {
    enumerable: true,
    get: function() {
        return __css;
    }
});
const _index = require("./devtools/index.cjs");
const _reduceToClassNameForSlots = require("./runtime/reduceToClassNameForSlots.cjs");
function __css(classesMapBySlot) {
    let ltrClassNamesForSlots = null;
    let rtlClassNamesForSlots = null;
    function computeClasses(options) {
        const { dir } = options;
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
        const classNamesForSlots = isLTR ? ltrClassNamesForSlots : rtlClassNamesForSlots;
        if (process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
            _index.debugData.addSequenceDetails(classNamesForSlots);
        }
        return classNamesForSlots;
    }
    return computeClasses;
} //# sourceMappingURL=__css.js.map
