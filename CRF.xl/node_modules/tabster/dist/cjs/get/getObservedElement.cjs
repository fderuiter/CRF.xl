/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getObservedElement", {
    enumerable: true,
    get: function() {
        return getObservedElement;
    }
});
const _ObservedElement = require("../State/ObservedElement.cjs");
function getObservedElement(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.observedElement) {
        tabsterCore.observedElement = new _ObservedElement.ObservedElementAPI(tabsterCore);
    }
    return tabsterCore.observedElement;
} //# sourceMappingURL=getObservedElement.js.map
