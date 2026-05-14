/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { createKeyborg, disposeKeyborg } from "keyborg";
import { Subscribable } from "./Subscribable.js";
export class KeyboardNavigationState extends Subscribable {
    _keyborg;
    constructor(getWindow) {
        super();
        this._keyborg = createKeyborg(getWindow());
        this._keyborg.subscribe(this._onChange);
    }
    dispose() {
        super.dispose();
        if (this._keyborg) {
            this._keyborg.unsubscribe(this._onChange);
            disposeKeyborg(this._keyborg);
            delete this._keyborg;
        }
    }
    _onChange = (isNavigatingWithKeyboard) => {
        this.setVal(isNavigatingWithKeyboard, undefined);
    };
    setNavigatingWithKeyboard(isNavigatingWithKeyboard) {
        this._keyborg?.setVal(isNavigatingWithKeyboard);
    }
    isNavigatingWithKeyboard() {
        return !!this._keyborg?.isNavigatingWithKeyboard();
    }
}
//# sourceMappingURL=KeyboardNavigation.js.map