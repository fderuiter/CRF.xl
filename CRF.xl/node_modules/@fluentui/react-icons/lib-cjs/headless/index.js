"use strict";
// Headless Fluent Icons API
// Import the shipped CSS file (headless.css) for default styling via data-attribute selectors.
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleIcon = exports.createFluentIcon = exports.useIconState = exports.useIconContext = exports.IconDirectionContextProvider = exports.cx = exports.DATA_FUI_ICON_FONT = exports.DATA_FUI_ICON_HIDDEN = exports.DATA_FUI_ICON_RTL = exports.DATA_FUI_ICON = exports.fontIconClassName = exports.iconColorClassName = exports.iconLightClassName = exports.iconRegularClassName = exports.iconFilledClassName = exports.iconClassName = void 0;
var shared_1 = require("./shared");
Object.defineProperty(exports, "iconClassName", { enumerable: true, get: function () { return shared_1.iconClassName; } });
Object.defineProperty(exports, "iconFilledClassName", { enumerable: true, get: function () { return shared_1.iconFilledClassName; } });
Object.defineProperty(exports, "iconRegularClassName", { enumerable: true, get: function () { return shared_1.iconRegularClassName; } });
Object.defineProperty(exports, "iconLightClassName", { enumerable: true, get: function () { return shared_1.iconLightClassName; } });
Object.defineProperty(exports, "iconColorClassName", { enumerable: true, get: function () { return shared_1.iconColorClassName; } });
Object.defineProperty(exports, "fontIconClassName", { enumerable: true, get: function () { return shared_1.fontIconClassName; } });
Object.defineProperty(exports, "DATA_FUI_ICON", { enumerable: true, get: function () { return shared_1.DATA_FUI_ICON; } });
Object.defineProperty(exports, "DATA_FUI_ICON_RTL", { enumerable: true, get: function () { return shared_1.DATA_FUI_ICON_RTL; } });
Object.defineProperty(exports, "DATA_FUI_ICON_HIDDEN", { enumerable: true, get: function () { return shared_1.DATA_FUI_ICON_HIDDEN; } });
Object.defineProperty(exports, "DATA_FUI_ICON_FONT", { enumerable: true, get: function () { return shared_1.DATA_FUI_ICON_FONT; } });
Object.defineProperty(exports, "cx", { enumerable: true, get: function () { return shared_1.cx; } });
// Context
var index_1 = require("../contexts/index");
Object.defineProperty(exports, "IconDirectionContextProvider", { enumerable: true, get: function () { return index_1.IconDirectionContextProvider; } });
Object.defineProperty(exports, "useIconContext", { enumerable: true, get: function () { return index_1.useIconContext; } });
// Core hook
var useIconState_1 = require("./useIconState");
Object.defineProperty(exports, "useIconState", { enumerable: true, get: function () { return useIconState_1.useIconState; } });
// SVG icon factories
var createFluentIcon_1 = require("./createFluentIcon");
Object.defineProperty(exports, "createFluentIcon", { enumerable: true, get: function () { return createFluentIcon_1.createFluentIcon; } });
var bundleIcon_1 = require("./bundleIcon");
Object.defineProperty(exports, "bundleIcon", { enumerable: true, get: function () { return bundleIcon_1.bundleIcon; } });
// TODO: to maintain API compat for build transform we will probably need to export this as well
// export { wrapIcon } from './wrapIcon';
