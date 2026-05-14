/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ /**
 * Allows default or user focus behaviour on the DOM subtree
 * i.e. Tabster will not control focus events within an uncontrolled area
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UncontrolledAPI", {
    enumerable: true,
    get: function() {
        return UncontrolledAPI;
    }
});
class UncontrolledAPI {
    _isUncontrolledCompletely;
    constructor(isUncontrolledCompletely){
        this._isUncontrolledCompletely = isUncontrolledCompletely;
    }
    isUncontrolledCompletely(element, completely) {
        const isUncontrolledCompletely = this._isUncontrolledCompletely?.(element, completely);
        // If isUncontrolledCompletely callback is not defined or returns undefined, then the default
        // behaviour is to return the uncontrolled.completely value from the element.
        return isUncontrolledCompletely === undefined ? completely : isUncontrolledCompletely;
    }
} //# sourceMappingURL=Uncontrolled.js.map
