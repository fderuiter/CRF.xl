import { insertionFactory } from './insertionFactory.js';
/**
 * A version of makeStaticStyles() that accepts build output as an input and skips all runtime transforms.
 *
 * @private
 */
export function __staticStyles(cssRules, factory = insertionFactory) {
    const insertStyles = factory();
    function useStaticStyles(options) {
        insertStyles(options.renderer, cssRules);
    }
    return useStaticStyles;
}
//# sourceMappingURL=__staticStyles.js.map