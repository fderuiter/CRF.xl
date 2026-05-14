import { injectDevTools, isDevToolsEnabled, debugData } from '../devtools/index.js';
import { normalizeCSSBucketEntry } from '../runtime/utils/normalizeCSSBucketEntry.js';
import { getStyleSheetForBucket } from './getStyleSheetForBucket.js';
import { safeInsertRule } from './safeInsertRule.js';
let lastIndex = 0;
/** @internal */
export const defaultCompareMediaQueries = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
/**
 * Creates a new instances of a renderer.
 *
 * @public
 */
export function createDOMRenderer(targetDocument = typeof document === 'undefined' ? undefined : document, options = {}) {
    const { classNameHashSalt, unstable_filterCSSRule, insertionPoint, styleElementAttributes, compareMediaQueries = defaultCompareMediaQueries, } = options;
    const renderer = {
        classNameHashSalt,
        insertionCache: {},
        stylesheets: {},
        styleElementAttributes: Object.freeze(styleElementAttributes),
        compareMediaQueries,
        id: `d${lastIndex++}`,
        insertCSSRules(cssRules) {
            // eslint-disable-next-line guard-for-in
            for (const styleBucketName in cssRules) {
                const cssRulesForBucket = cssRules[styleBucketName];
                // This is a hot path in rendering styles: ".length" is cached in "l" var to avoid accesses the property
                for (let i = 0, l = cssRulesForBucket.length; i < l; i++) {
                    const [ruleCSS, metadata] = normalizeCSSBucketEntry(cssRulesForBucket[i]);
                    const sheet = getStyleSheetForBucket(styleBucketName, targetDocument, insertionPoint || null, renderer, metadata);
                    if (renderer.insertionCache[ruleCSS]) {
                        continue;
                    }
                    renderer.insertionCache[ruleCSS] = styleBucketName;
                    if (process.env.NODE_ENV !== 'production' && isDevToolsEnabled) {
                        debugData.addCSSRule(ruleCSS);
                    }
                    if (unstable_filterCSSRule) {
                        if (unstable_filterCSSRule(ruleCSS)) {
                            safeInsertRule(sheet, ruleCSS);
                        }
                    }
                    else {
                        safeInsertRule(sheet, ruleCSS);
                    }
                }
            }
        },
    };
    if (targetDocument && process.env.NODE_ENV !== 'production' && isDevToolsEnabled) {
        injectDevTools(targetDocument);
    }
    return renderer;
}
//# sourceMappingURL=createDOMRenderer.js.map