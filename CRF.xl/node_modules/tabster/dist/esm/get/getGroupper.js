/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { GroupperAPI } from "../Groupper.js";
/**
 * Creates a new groupper instance or returns an existing one
 * @param tabster Tabster instance
 */
export function getGroupper(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.groupper) {
        const api = new GroupperAPI(tabsterCore, tabsterCore.getWindow);
        tabsterCore.groupper = api;
        tabsterCore.attrHandlers.set("groupper", (element, existingGroupper, newProps, _oldProps, sys) => {
            if (existingGroupper) {
                existingGroupper.setProps(newProps);
                return existingGroupper;
            }
            return api.createGroupper(element, newProps, sys);
        });
    }
    return tabsterCore.groupper;
}
//# sourceMappingURL=getGroupper.js.map