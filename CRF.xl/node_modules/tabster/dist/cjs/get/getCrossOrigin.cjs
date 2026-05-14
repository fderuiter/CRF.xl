/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getCrossOrigin", {
    enumerable: true,
    get: function() {
        return getCrossOrigin;
    }
});
const _CrossOrigin = require("../CrossOrigin.cjs");
const _getDeloser = require("./getDeloser.cjs");
const _getModalizer = require("./getModalizer.cjs");
const _getMover = require("./getMover.cjs");
const _getGroupper = require("./getGroupper.cjs");
const _getOutline = require("./getOutline.cjs");
const _getObservedElement = require("./getObservedElement.cjs");
function getCrossOrigin(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.crossOrigin) {
        (0, _getDeloser.getDeloser)(tabster);
        (0, _getModalizer.getModalizer)(tabster);
        (0, _getMover.getMover)(tabster);
        (0, _getGroupper.getGroupper)(tabster);
        (0, _getOutline.getOutline)(tabster);
        (0, _getObservedElement.getObservedElement)(tabster);
        tabsterCore.crossOrigin = new _CrossOrigin.CrossOriginAPI(tabsterCore);
    }
    return tabsterCore.crossOrigin;
} //# sourceMappingURL=getCrossOrigin.js.map
