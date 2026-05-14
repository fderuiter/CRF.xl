/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type * as Types from "./Types.js";
/**
 * Allows default or user focus behaviour on the DOM subtree
 * i.e. Tabster will not control focus events within an uncontrolled area
 */
export declare class UncontrolledAPI implements Types.UncontrolledAPI {
    private _isUncontrolledCompletely?;
    constructor(isUncontrolledCompletely?: (element: HTMLElement, completely: boolean) => boolean | undefined);
    isUncontrolledCompletely(element: HTMLElement, completely: boolean): boolean;
}
//# sourceMappingURL=Uncontrolled.d.ts.map