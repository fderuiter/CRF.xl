import { debugData, isDevToolsEnabled } from './devtools/index.js';
import { reduceToClassNameForSlots } from './runtime/reduceToClassNameForSlots.js';
/**
 * A version of makeStyles() that accepts build output as an input and skips all runtime transforms & DOM insertion.
 *
 * @private
 */
export function __css(classesMapBySlot) {
    let ltrClassNamesForSlots = null;
    let rtlClassNamesForSlots = null;
    function computeClasses(options) {
        const { dir } = options;
        const isLTR = dir === 'ltr';
        if (isLTR) {
            if (ltrClassNamesForSlots === null) {
                ltrClassNamesForSlots = reduceToClassNameForSlots(classesMapBySlot, dir);
            }
        }
        else {
            if (rtlClassNamesForSlots === null) {
                rtlClassNamesForSlots = reduceToClassNameForSlots(classesMapBySlot, dir);
            }
        }
        const classNamesForSlots = isLTR
            ? ltrClassNamesForSlots
            : rtlClassNamesForSlots;
        if (process.env.NODE_ENV !== 'production' && isDevToolsEnabled) {
            debugData.addSequenceDetails(classNamesForSlots);
        }
        return classNamesForSlots;
    }
    return computeClasses;
}
//# sourceMappingURL=__css.js.map