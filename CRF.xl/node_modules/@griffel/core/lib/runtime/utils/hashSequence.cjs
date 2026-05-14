"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "hashSequence", {
    enumerable: true,
    get: function() {
        return hashSequence;
    }
});
const _hash = /*#__PURE__*/ _interop_require_default(require("@emotion/hash"));
const _constants = require("../../constants.cjs");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function padEndHash(value) {
    const hashLength = value.length;
    if (hashLength === _constants.SEQUENCE_HASH_LENGTH) {
        return value;
    }
    for(let i = hashLength; i < _constants.SEQUENCE_HASH_LENGTH; i++){
        value += '0';
    }
    return value;
}
function hashSequence(classes, dir, sequenceIds = []) {
    if (process.env.NODE_ENV === 'production') {
        return _constants.SEQUENCE_PREFIX + padEndHash((0, _hash.default)(classes + dir));
    }
    return _constants.SEQUENCE_PREFIX + padEndHash((0, _hash.default)(classes + dir)) + _constants.DEBUG_SEQUENCE_SEPARATOR + padEndHash((0, _hash.default)(sequenceIds.join('')));
} //# sourceMappingURL=hashSequence.js.map
