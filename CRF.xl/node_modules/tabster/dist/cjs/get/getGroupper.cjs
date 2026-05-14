/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getGroupper", {
    enumerable: true,
    get: function() {
        return getGroupper;
    }
});
const _Groupper = require("../Groupper.cjs");
function getGroupper(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.groupper) {
        const api = new _Groupper.GroupperAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.groupper = api;
        tabsterCore.attrHandlers.set("groupper", (element, existingGroupper, newProps, _oldProps, sys)=>{
            if (existingGroupper) {
                existingGroupper.setProps(newProps);
                return existingGroupper;
            }
            return api.createGroupper(element, newProps, sys);
        });
    }
    return tabsterCore.groupper;
} //# sourceMappingURL=getGroupper.js.map
