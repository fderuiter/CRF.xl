/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getOutline", {
    enumerable: true,
    get: function() {
        return getOutline;
    }
});
const _Outline = require("../Outline.cjs");
function getOutline(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.outline) {
        tabsterCore.outline = new _Outline.OutlineAPI(tabsterCore);
    }
    return tabsterCore.outline;
} //# sourceMappingURL=getOutline.js.map
