import { insertionFactory } from './insertionFactory.js';
import { resolveStaticStyleRules } from './runtime/resolveStaticStyleRules.js';
export function makeStaticStyles(styles, factory = insertionFactory) {
    const insertStyles = factory();
    const stylesSet = Array.isArray(styles) ? styles : [styles];
    function useStaticStyles(options) {
        insertStyles(options.renderer, 
        // 👇 static rules should be inserted into default bucket
        { d: resolveStaticStyleRules(stylesSet) });
    }
    return useStaticStyles;
}
//# sourceMappingURL=makeStaticStyles.js.map