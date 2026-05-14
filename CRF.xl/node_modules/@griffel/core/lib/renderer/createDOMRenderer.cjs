"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get createDOMRenderer () {
        return createDOMRenderer;
    },
    get defaultCompareMediaQueries () {
        return defaultCompareMediaQueries;
    }
});
const _index = require("../devtools/index.cjs");
const _normalizeCSSBucketEntry = require("../runtime/utils/normalizeCSSBucketEntry.cjs");
const _getStyleSheetForBucket = require("./getStyleSheetForBucket.cjs");
const _safeInsertRule = require("./safeInsertRule.cjs");
let lastIndex = 0;
const defaultCompareMediaQueries = (a, b)=>a < b ? -1 : a > b ? 1 : 0;
function createDOMRenderer(targetDocument = typeof document === 'undefined' ? undefined : document, options = {}) {
    const { classNameHashSalt, unstable_filterCSSRule, insertionPoint, styleElementAttributes, compareMediaQueries = defaultCompareMediaQueries } = options;
    const renderer = {
        classNameHashSalt,
        insertionCache: {},
        stylesheets: {},
        styleElementAttributes: Object.freeze(styleElementAttributes),
        compareMediaQueries,
        id: `d${lastIndex++}`,
        insertCSSRules (cssRules) {
            // eslint-disable-next-line guard-for-in
            for(const styleBucketName in cssRules){
                const cssRulesForBucket = cssRules[styleBucketName];
                // This is a hot path in rendering styles: ".length" is cached in "l" var to avoid accesses the property
                for(let i = 0, l = cssRulesForBucket.length; i < l; i++){
                    const [ruleCSS, metadata] = (0, _normalizeCSSBucketEntry.normalizeCSSBucketEntry)(cssRulesForBucket[i]);
                    const sheet = (0, _getStyleSheetForBucket.getStyleSheetForBucket)(styleBucketName, targetDocument, insertionPoint || null, renderer, metadata);
                    if (renderer.insertionCache[ruleCSS]) {
                        continue;
                    }
                    renderer.insertionCache[ruleCSS] = styleBucketName;
                    if (process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
                        _index.debugData.addCSSRule(ruleCSS);
                    }
                    if (unstable_filterCSSRule) {
                        if (unstable_filterCSSRule(ruleCSS)) {
                            (0, _safeInsertRule.safeInsertRule)(sheet, ruleCSS);
                        }
                    } else {
                        (0, _safeInsertRule.safeInsertRule)(sheet, ruleCSS);
                    }
                }
            }
        }
    };
    if (targetDocument && process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
        (0, _index.injectDevTools)(targetDocument);
    }
    return renderer;
} //# sourceMappingURL=createDOMRenderer.js.map
