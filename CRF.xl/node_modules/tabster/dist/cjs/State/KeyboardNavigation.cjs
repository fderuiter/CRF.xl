/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KeyboardNavigationState", {
    enumerable: true,
    get: function() {
        return KeyboardNavigationState;
    }
});
const _keyborg = require("keyborg");
const _Subscribable = require("./Subscribable.cjs");
class KeyboardNavigationState extends _Subscribable.Subscribable {
    _keyborg;
    constructor(getWindow){
        super();
        this._keyborg = (0, _keyborg.createKeyborg)(getWindow());
        this._keyborg.subscribe(this._onChange);
    }
    dispose() {
        super.dispose();
        if (this._keyborg) {
            this._keyborg.unsubscribe(this._onChange);
            (0, _keyborg.disposeKeyborg)(this._keyborg);
            delete this._keyborg;
        }
    }
    _onChange = (isNavigatingWithKeyboard)=>{
        this.setVal(isNavigatingWithKeyboard, undefined);
    };
    setNavigatingWithKeyboard(isNavigatingWithKeyboard) {
        this._keyborg?.setVal(isNavigatingWithKeyboard);
    }
    isNavigatingWithKeyboard() {
        return !!this._keyborg?.isNavigatingWithKeyboard();
    }
} //# sourceMappingURL=KeyboardNavigation.js.map
