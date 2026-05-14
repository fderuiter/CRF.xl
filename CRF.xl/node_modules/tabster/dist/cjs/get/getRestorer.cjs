/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getRestorer", {
    enumerable: true,
    get: function() {
        return getRestorer;
    }
});
const _Restorer = require("../Restorer.cjs");
function getRestorer(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.restorer) {
        const api = new _Restorer.RestorerAPI(tabsterCore);
        tabsterCore.restorer = api;
        tabsterCore.attrHandlers.set("restorer", (element, existingRestorer, newProps)=>{
            if (existingRestorer) {
                existingRestorer.setProps(newProps);
                return existingRestorer;
            }
            return api.createRestorer(element, newProps);
        });
    }
    return tabsterCore.restorer;
} //# sourceMappingURL=getRestorer.js.map
