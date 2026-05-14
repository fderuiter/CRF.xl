/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { GroupperMoveFocusEvent, MoverMoveFocusEvent, MoverMemorizedElementEvent, } from "./Events.js";
/** @deprecated This function is obsolete, use native element.dispatchEvent(new GroupperMoveFocusEvent(...)). */
export function dispatchGroupperMoveFocusEvent(target, action) {
    return target.dispatchEvent(new GroupperMoveFocusEvent({ action }));
}
/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMoveFocusEvent(...)). */
export function dispatchMoverMoveFocusEvent(target, key) {
    return target.dispatchEvent(new MoverMoveFocusEvent({ key }));
}
/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMemorizedElementEvent(...)). */
export function dispatchMoverMemorizedElementEvent(target, memorizedElement) {
    return target.dispatchEvent(new MoverMemorizedElementEvent({ memorizedElement }));
}
//# sourceMappingURL=Deprecated.js.map