// This should be just "export * as shorthands from "
// https://github.com/microsoft/fluentui/issues/20694
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
    get __css () {
        return __css.__css;
    },
    get __resetCSS () {
        return __resetCSS.__resetCSS;
    },
    get __resetStyles () {
        return __resetStyles.__resetStyles;
    },
    get __staticCSS () {
        return __staticCSS.__staticCSS;
    },
    get __staticStyles () {
        return __staticStyles.__staticStyles;
    },
    get __styles () {
        return __styles.__styles;
    },
    get createDOMRenderer () {
        return _createDOMRenderer.createDOMRenderer;
    },
    get defaultCompareMediaQueries () {
        return _createDOMRenderer.defaultCompareMediaQueries;
    },
    get getStyleBucketName () {
        return _getStyleBucketName.getStyleBucketName;
    },
    get getStyleSheetKey () {
        return _getStyleSheetForBucket.getStyleSheetKey;
    },
    get makeResetStyles () {
        return _makeResetStyles.makeResetStyles;
    },
    get makeStaticStyles () {
        return _makeStaticStyles.makeStaticStyles;
    },
    get makeStyles () {
        return _makeStyles.makeStyles;
    },
    get mergeClasses () {
        return _mergeClasses.mergeClasses;
    },
    get normalizeCSSBucketEntry () {
        return _normalizeCSSBucketEntry.normalizeCSSBucketEntry;
    },
    get reduceToClassNameForSlots () {
        return _reduceToClassNameForSlots.reduceToClassNameForSlots;
    },
    get rehydrateRendererCache () {
        return _rehydrateRendererCache.rehydrateRendererCache;
    },
    get resolveResetStyleRules () {
        return _resolveResetStyleRules.resolveResetStyleRules;
    },
    get resolveStaticStyleRules () {
        return _resolveStaticStyleRules.resolveStaticStyleRules;
    },
    get resolveStyleRules () {
        return _resolveStyleRules.resolveStyleRules;
    },
    get resolveStyleRulesForSlots () {
        return _resolveStyleRulesForSlots.resolveStyleRulesForSlots;
    },
    get safeInsertRule () {
        return _safeInsertRule.safeInsertRule;
    },
    get shorthands () {
        return shorthands;
    },
    get styleBucketOrdering () {
        return _getStyleSheetForBucket.styleBucketOrdering;
    }
});
const _index = require("./shorthands/index.cjs");
const _createDOMRenderer = require("./renderer/createDOMRenderer.cjs");
const _rehydrateRendererCache = require("./renderer/rehydrateRendererCache.cjs");
const _safeInsertRule = require("./renderer/safeInsertRule.cjs");
const _mergeClasses = require("./mergeClasses.cjs");
const _makeStyles = require("./makeStyles.cjs");
const _makeStaticStyles = require("./makeStaticStyles.cjs");
const _makeResetStyles = require("./makeResetStyles.cjs");
const _resolveStyleRulesForSlots = require("./resolveStyleRulesForSlots.cjs");
const __css = require("./__css.cjs");
const __styles = require("./__styles.cjs");
const __resetCSS = require("./__resetCSS.cjs");
const __resetStyles = require("./__resetStyles.cjs");
const __staticCSS = require("./__staticCSS.cjs");
const __staticStyles = require("./__staticStyles.cjs");
const _normalizeCSSBucketEntry = require("./runtime/utils/normalizeCSSBucketEntry.cjs");
const _getStyleSheetForBucket = require("./renderer/getStyleSheetForBucket.cjs");
const _getStyleBucketName = require("./runtime/getStyleBucketName.cjs");
const _reduceToClassNameForSlots = require("./runtime/reduceToClassNameForSlots.cjs");
const _resolveStyleRules = require("./runtime/resolveStyleRules.cjs");
const _resolveResetStyleRules = require("./runtime/resolveResetStyleRules.cjs");
const _resolveStaticStyleRules = require("./runtime/resolveStaticStyleRules.cjs");
_export_star(require("./constants.cjs"), exports);
function _export_star(from, to) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}
const shorthands = {
    border: _index.border,
    borderLeft: _index.borderLeft,
    borderBottom: _index.borderBottom,
    borderRight: _index.borderRight,
    borderTop: _index.borderTop,
    borderColor: _index.borderColor,
    borderStyle: _index.borderStyle,
    borderRadius: _index.borderRadius,
    borderWidth: _index.borderWidth,
    flex: _index.flex,
    gap: _index.gap,
    gridArea: _index.gridArea,
    margin: _index.margin,
    marginBlock: _index.marginBlock,
    marginInline: _index.marginInline,
    padding: _index.padding,
    paddingBlock: _index.paddingBlock,
    paddingInline: _index.paddingInline,
    overflow: _index.overflow,
    inset: _index.inset,
    outline: _index.outline,
    transition: _index.transition,
    textDecoration: _index.textDecoration
};
 //# sourceMappingURL=index.js.map
