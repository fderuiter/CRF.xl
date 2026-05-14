"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "assertIsDefinedRef", {
    enumerable: true,
    get: function() {
        return assertIsDefinedRef;
    }
});
function assertIsDefinedRef(refObject, msg = `assertIsDefinedRef: reference not properly defined ${refObject}`) {
    // eslint-disable-next-line eqeqeq
    if (refObject.current == undefined && process.env.NODE_ENV === 'development') {
        throw new TypeError(msg);
    }
}
