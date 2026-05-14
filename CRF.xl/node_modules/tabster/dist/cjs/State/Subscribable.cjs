/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Subscribable", {
    enumerable: true,
    get: function() {
        return Subscribable;
    }
});
class Subscribable {
    _val;
    _callbacks = [];
    dispose() {
        this._callbacks = [];
        delete this._val;
    }
    subscribe(callback) {
        const callbacks = this._callbacks;
        const index = callbacks.indexOf(callback);
        if (index < 0) {
            callbacks.push(callback);
        }
    }
    subscribeFirst(callback) {
        const callbacks = this._callbacks;
        const index = callbacks.indexOf(callback);
        if (index >= 0) {
            callbacks.splice(index, 1);
        }
        callbacks.unshift(callback);
    }
    unsubscribe(callback) {
        const index = this._callbacks.indexOf(callback);
        if (index >= 0) {
            this._callbacks.splice(index, 1);
        }
    }
    setVal(val, detail) {
        if (this._val === val) {
            return;
        }
        this._val = val;
        this._callCallbacks(val, detail);
    }
    getVal() {
        return this._val;
    }
    trigger(val, detail) {
        this._callCallbacks(val, detail);
    }
    _callCallbacks(val, detail) {
        this._callbacks.forEach((callback)=>callback(val, detail));
    }
} //# sourceMappingURL=Subscribable.js.map
