"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "hashClassName", {
    enumerable: true,
    get: function() {
        return hashClassName;
    }
});
const _hash = /*#__PURE__*/ _interop_require_default(require("@emotion/hash"));
const _constants = require("../../constants.cjs");
const _hashPropertyKey = require("./hashPropertyKey.cjs");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function hashClassName({ property, selector, salt, value }, atRules) {
    return _constants.HASH_PREFIX + (0, _hash.default)(salt + selector + (0, _hashPropertyKey.atRulesToString)(atRules) + property + // Trimming of value is required to generate consistent hashes
    value.trim());
} //# sourceMappingURL=hashClassName.js.map
