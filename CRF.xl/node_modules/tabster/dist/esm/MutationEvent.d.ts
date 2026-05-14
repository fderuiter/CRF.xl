/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import type * as Types from "./Types.js";
import { type HTMLElementWithUID } from "./Utils.js";
export declare function observeMutations(doc: Document, tabster: Types.TabsterCore, updateTabsterByAttribute: (tabster: Types.TabsterCore, element: HTMLElementWithUID, dispose?: boolean) => void, syncState: boolean): () => void;
//# sourceMappingURL=MutationEvent.d.ts.map