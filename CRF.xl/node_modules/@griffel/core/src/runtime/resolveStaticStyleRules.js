import { compileCSSRules } from './compileCSSRules.js';
import { compileStaticCSS } from './compileStaticCSS.js';
export function resolveStaticStyleRules(stylesSet) {
    return stylesSet.reduce((acc, styles) => {
        if (typeof styles === 'string') {
            const cssRules = compileCSSRules(styles, false);
            for (const rule of cssRules) {
                acc.push(rule);
            }
            return acc;
        }
        // eslint-disable-next-line guard-for-in
        for (const property in styles) {
            const value = styles[property];
            const staticCSS = compileStaticCSS(property, value);
            acc.push(staticCSS);
        }
        return acc;
    }, []);
}
//# sourceMappingURL=resolveStaticStyleRules.js.map