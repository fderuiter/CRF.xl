"use strict";
// Data attribute names used by headless icons for CSS targeting.
// The shipped headless.css file uses these attribute selectors for styling.
Object.defineProperty(exports, "__esModule", { value: true });
exports.cx = exports.fontIconClassName = exports.iconColorClassName = exports.iconLightClassName = exports.iconRegularClassName = exports.iconFilledClassName = exports.iconClassName = exports.DATA_FUI_ICON_FONT = exports.DATA_FUI_ICON_HIDDEN = exports.DATA_FUI_ICON_RTL = exports.DATA_FUI_ICON = void 0;
/** Base data attribute applied to all icons (SVG and font). */
exports.DATA_FUI_ICON = 'data-fui-icon';
/** Data attribute applied to icons that should flip in RTL text direction. */
exports.DATA_FUI_ICON_RTL = 'data-fui-icon-rtl';
/** Data attribute applied to the inactive variant in a bundled icon pair. */
exports.DATA_FUI_ICON_HIDDEN = 'data-fui-icon-hidden';
/** Data attribute for font icon font-family variant selection (filled|regular|resizable|light). */
exports.DATA_FUI_ICON_FONT = 'data-fui-icon-font';
// Re-export existing constants (CSS class names for consumer targeting)
var constants_1 = require("../utils/constants");
Object.defineProperty(exports, "iconClassName", { enumerable: true, get: function () { return constants_1.iconClassName; } });
Object.defineProperty(exports, "iconFilledClassName", { enumerable: true, get: function () { return constants_1.iconFilledClassName; } });
Object.defineProperty(exports, "iconRegularClassName", { enumerable: true, get: function () { return constants_1.iconRegularClassName; } });
Object.defineProperty(exports, "iconLightClassName", { enumerable: true, get: function () { return constants_1.iconLightClassName; } });
Object.defineProperty(exports, "iconColorClassName", { enumerable: true, get: function () { return constants_1.iconColorClassName; } });
Object.defineProperty(exports, "fontIconClassName", { enumerable: true, get: function () { return constants_1.fontIconClassName; } });
/**
 * Joins class name strings, filtering out falsy values.
 */
function cx(...classes) {
    const result = classes.filter(Boolean).join(' ');
    return result || undefined;
}
exports.cx = cx;
