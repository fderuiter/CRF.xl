/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type * as Types from "../Types.js";
import { Subscribable } from "./Subscribable.js";
export declare class KeyboardNavigationState extends Subscribable<boolean> implements Types.KeyboardNavigationState {
    private _keyborg?;
    constructor(getWindow: Types.GetWindow);
    dispose(): void;
    private _onChange;
    setNavigatingWithKeyboard(isNavigatingWithKeyboard: boolean): void;
    isNavigatingWithKeyboard(): boolean;
}
//# sourceMappingURL=KeyboardNavigation.d.ts.map