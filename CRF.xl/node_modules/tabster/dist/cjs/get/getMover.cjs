/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getMover", {
    enumerable: true,
    get: function() {
        return getMover;
    }
});
const _Mover = require("../Mover.cjs");
function getMover(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.mover) {
        const api = new _Mover.MoverAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.mover = api;
        tabsterCore.attrHandlers.set("mover", (element, existingMover, newProps, _oldProps, sys)=>{
            if (existingMover) {
                existingMover.setProps(newProps);
                return existingMover;
            }
            return api.createMover(element, newProps, sys);
        });
    }
    return tabsterCore.mover;
} //# sourceMappingURL=getMover.js.map
