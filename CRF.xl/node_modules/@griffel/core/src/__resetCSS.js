import { DEBUG_RESET_CLASSES } from './constants.js';
/**
 * @private
 */
export function __resetCSS(ltrClassName, rtlClassName) {
    function computeClassName(options) {
        const { dir } = options;
        const className = dir === 'ltr' ? ltrClassName : rtlClassName || ltrClassName;
        if (process.env.NODE_ENV !== 'production') {
            DEBUG_RESET_CLASSES[className] = 1;
        }
        return className;
    }
    return computeClassName;
}
//# sourceMappingURL=__resetCSS.js.map