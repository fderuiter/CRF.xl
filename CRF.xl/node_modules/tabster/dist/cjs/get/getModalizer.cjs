/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getModalizer", {
    enumerable: true,
    get: function() {
        return getModalizer;
    }
});
const _Modalizer = require("../Modalizer.cjs");
function getModalizer(tabster, // @deprecated use accessibleCheck.
alwaysAccessibleSelector, accessibleCheck) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.modalizer) {
        const api = new _Modalizer.ModalizerAPI(tabsterCore, alwaysAccessibleSelector, accessibleCheck);
        tabsterCore.modalizer = api;
        tabsterCore.attrHandlers.set("modalizer", (element, existingModalizer, newProps, oldProps, sys)=>{
            if (existingModalizer) {
                if (newProps.id && oldProps?.id !== newProps.id) {
                    // Modalizer id is changed, given the modalizers have
                    // complex logic and could be composite, it is easier
                    // to recreate the Modalizer instance than to implement
                    // the id update.
                    existingModalizer.dispose();
                    return api.createModalizer(element, newProps, sys);
                }
                existingModalizer.setProps(newProps);
                return existingModalizer;
            }
            return api.createModalizer(element, newProps, sys);
        });
    }
    return tabsterCore.modalizer;
} //# sourceMappingURL=getModalizer.js.map
