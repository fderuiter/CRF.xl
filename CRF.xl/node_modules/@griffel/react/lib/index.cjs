'use client';
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
    get RESET () {
        return _core.RESET;
    },
    get RendererProvider () {
        return _RendererContext.RendererProvider;
    },
    get TextDirectionProvider () {
        return _TextDirectionContext.TextDirectionProvider;
    },
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
        return _core.createDOMRenderer;
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
        return _core.mergeClasses;
    },
    get renderToStyleElements () {
        return _renderToStyleElements.renderToStyleElements;
    },
    get shorthands () {
        return _core.shorthands;
    },
    get useRenderer_unstable () {
        return _RendererContext.useRenderer;
    }
});
const _core = require("@griffel/core");
const _makeStyles = require("./makeStyles.cjs");
const _makeResetStyles = require("./makeResetStyles.cjs");
const _makeStaticStyles = require("./makeStaticStyles.cjs");
const _renderToStyleElements = require("./renderToStyleElements.cjs");
const _RendererContext = require("./RendererContext.cjs");
const _TextDirectionContext = require("./TextDirectionContext.cjs");
const __css = require("./__css.cjs");
const __styles = require("./__styles.cjs");
const __resetCSS = require("./__resetCSS.cjs");
const __resetStyles = require("./__resetStyles.cjs");
const __staticCSS = require("./__staticCSS.cjs");
const __staticStyles = require("./__staticStyles.cjs");
 //# sourceMappingURL=index.js.map
