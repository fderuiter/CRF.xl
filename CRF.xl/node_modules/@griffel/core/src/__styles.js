import { debugData, isDevToolsEnabled, getSourceURLfromError } from './devtools/index.js';
import { insertionFactory } from './insertionFactory.js';
import { reduceToClassNameForSlots } from './runtime/reduceToClassNameForSlots.js';
/**
 * A version of makeStyles() that accepts build output as an input and skips all runtime transforms.
 *
 * @private
 */
export function __styles(classesMapBySlot, cssRules, factory = insertionFactory) {
    const insertStyles = factory();
    let ltrClassNamesForSlots = null;
    let rtlClassNamesForSlots = null;
    let sourceURL;
    if (process.env.NODE_ENV !== 'production' && isDevToolsEnabled) {
        sourceURL = getSourceURLfromError();
    }
    function computeClasses(options) {
        const { dir, renderer } = options;
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
        insertStyles(renderer, cssRules);
        const classNamesForSlots = isLTR
            ? ltrClassNamesForSlots
            : rtlClassNamesForSlots;
        if (process.env.NODE_ENV !== 'production' && isDevToolsEnabled) {
            debugData.addSequenceDetails(classNamesForSlots, sourceURL);
        }
        return classNamesForSlots;
    }
    return computeClasses;
}
//# sourceMappingURL=__styles.js.map