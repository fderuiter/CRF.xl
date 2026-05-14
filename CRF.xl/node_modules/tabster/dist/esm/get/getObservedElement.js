/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ObservedElementAPI } from "../State/ObservedElement.js";
export function getObservedElement(tabster) {
    const tabsterCore = tabster.core;
    if (!tabsterCore.observedElement) {
        tabsterCore.observedElement = new ObservedElementAPI(tabsterCore);
    }
    return tabsterCore.observedElement;
}
//# sourceMappingURL=getObservedElement.js.map