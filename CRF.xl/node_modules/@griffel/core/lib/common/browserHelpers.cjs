// Shared helpers and fixtures for Vitest browser-mode tests in @griffel/core.
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
    get COLORS () {
        return COLORS;
    },
    get applyResetStyles () {
        return applyResetStyles;
    },
    get applyStyles () {
        return applyStyles;
    },
    get commands () {
        return commands;
    },
    get getColor () {
        return getColor;
    },
    get getComputedBackgroundColor () {
        return getComputedBackgroundColor;
    },
    get render () {
        return render;
    },
    get resetBrowserTestState () {
        return resetBrowserTestState;
    }
});
const _context = require("@vitest/browser/context");
const _index = require("../index.cjs");
const commands = _context.commands;
const COLORS = {
    WHITE: 'rgb(255, 255, 255)',
    YELLOW: 'rgb(255, 255, 0)',
    CYAN: 'rgb(0, 255, 255)',
    ORANGE: 'rgb(255, 165, 0)',
    BLUE: 'rgb(0, 0, 255)',
    RED: 'rgb(255, 0, 0)',
    BLACK: 'rgb(0, 0, 0)',
    LIGHT_GREEN: 'rgb(144, 238, 144)'
};
function render(html) {
    document.body.innerHTML = html;
}
function getComputedBackgroundColor(el) {
    return getComputedStyle(el).backgroundColor;
}
function getColor(el) {
    return getComputedStyle(el).color;
}
function applyStyles(stylesBySlot) {
    const getStyles = (0, _index.makeStyles)(stylesBySlot);
    const renderer = (0, _index.createDOMRenderer)(document);
    return getStyles({
        dir: 'ltr',
        renderer
    });
}
function applyResetStyles(styles) {
    const getClassName = (0, _index.makeResetStyles)(styles);
    const renderer = (0, _index.createDOMRenderer)(document);
    return getClassName({
        dir: 'ltr',
        renderer
    });
}
function resetBrowserTestState() {
    document.body.innerHTML = '';
    document.head.querySelectorAll('style[data-make-styles-bucket]').forEach((el)=>el.remove());
} //# sourceMappingURL=browserHelpers.js.map
