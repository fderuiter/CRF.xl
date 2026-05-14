/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getDeloser", {
    enumerable: true,
    get: function() {
        return getDeloser;
    }
});
const _Deloser = require("../Deloser.cjs");
function getDeloser(tabster, props) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.deloser) {
        const api = new _Deloser.DeloserAPI(tabsterCore, props);
        tabsterCore.deloser = api;
        tabsterCore.attrHandlers.set("deloser", (element, existingDeloser, newProps)=>{
            if (existingDeloser) {
                existingDeloser.setProps(newProps);
                return existingDeloser;
            }
            return api.createDeloser(element, newProps);
        });
    }
    return tabsterCore.deloser;
} //# sourceMappingURL=getDeloser.js.map
