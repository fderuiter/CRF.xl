/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get dispatchGroupperMoveFocusEvent () {
        return dispatchGroupperMoveFocusEvent;
    },
    get dispatchMoverMemorizedElementEvent () {
        return dispatchMoverMemorizedElementEvent;
    },
    get dispatchMoverMoveFocusEvent () {
        return dispatchMoverMoveFocusEvent;
    }
});
const _Events = require("./Events.cjs");
function dispatchGroupperMoveFocusEvent(target, action) {
    return target.dispatchEvent(new _Events.GroupperMoveFocusEvent({
        action
    }));
}
function dispatchMoverMoveFocusEvent(target, key) {
    return target.dispatchEvent(new _Events.MoverMoveFocusEvent({
        key
    }));
}
function dispatchMoverMemorizedElementEvent(target, memorizedElement) {
    return target.dispatchEvent(new _Events.MoverMemorizedElementEvent({
        memorizedElement
    }));
} //# sourceMappingURL=Deprecated.js.map
