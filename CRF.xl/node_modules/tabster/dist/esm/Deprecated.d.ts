/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { type GroupperMoveFocusAction, type MoverKey } from "./Types.js";
/** @deprecated This function is obsolete, use native element.dispatchEvent(new GroupperMoveFocusEvent(...)). */
export declare function dispatchGroupperMoveFocusEvent(target: HTMLElement, action: GroupperMoveFocusAction): boolean;
/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMoveFocusEvent(...)). */
export declare function dispatchMoverMoveFocusEvent(target: HTMLElement, key: MoverKey): boolean;
/** @deprecated This function is obsolete, use native element.dispatchEvent(new MoverMemorizedElementEvent(...)). */
export declare function dispatchMoverMemorizedElementEvent(target: HTMLElement, memorizedElement: HTMLElement | undefined): boolean;
//# sourceMappingURL=Deprecated.d.ts.map