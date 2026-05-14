/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { OutlineAPI } from "../Outline.js";
export function getOutline(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.outline) {
        tabsterCore.outline = new OutlineAPI(tabsterCore);
    }
    return tabsterCore.outline;
}
//# sourceMappingURL=getOutline.js.map