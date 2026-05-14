/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type * as Types from "./Types.js";
export declare function forceCleanup(tabster: Types.Tabster): void;
/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 */
export declare function createTabster(win: Window, props?: Types.TabsterCoreProps): Types.Tabster;
/**
 * Returns an instance of Tabster if it was created before or null.
 */
export declare function getTabster(win: Window): Types.Tabster | null;
export declare function getShadowDOMAPI(): Types.DOMAPI;
export declare function getInternal(tabster: Types.Tabster): Types.InternalAPI;
export declare function disposeTabster(tabster: Types.Tabster, allInstances?: boolean): void;
/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */
export declare function getCurrentTabster(win: Window): Types.TabsterCore | undefined;
/**
 * Allows to make Tabster non operational. Intended for performance debugging (and other
 * kinds of debugging), you can switch Tabster off without changing the application code
 * that consumes it.
 * @param tabster a reference created by createTabster().
 * @param noop true if you want to make Tabster noop, false if you want to turn it back.
 */
export declare function makeNoOp(tabster: Types.Tabster, noop: boolean): void;
export declare function isNoOp(tabster: Types.TabsterCore): boolean;
export { getCrossOrigin } from "./get/getCrossOrigin.js";
export { getDeloser } from "./get/getDeloser.js";
export { getGroupper } from "./get/getGroupper.js";
export { getModalizer } from "./get/getModalizer.js";
export { getMover } from "./get/getMover.js";
export { getObservedElement } from "./get/getObservedElement.js";
export { getOutline } from "./get/getOutline.js";
export { getRestorer } from "./get/getRestorer.js";
//# sourceMappingURL=Tabster.d.ts.map