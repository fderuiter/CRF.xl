"use strict";
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
    get atRulesToString () {
        return atRulesToString;
    },
    get hashPropertyKey () {
        return hashPropertyKey;
    }
});
const _hash = /*#__PURE__*/ _interop_require_default(require("@emotion/hash"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function addAtRulePrefix(atRule, prefix) {
    return atRule ? prefix + atRule : atRule;
}
function atRulesToString(atRules) {
    return addAtRulePrefix(atRules.container, 'c') + addAtRulePrefix(atRules.media, 'm') + addAtRulePrefix(atRules.layer, 'l') + addAtRulePrefix(atRules.supports, 's') + addAtRulePrefix(atRules.scope, 'o');
}
function hashPropertyKey(selector, property, atRules) {
    // uniq key based on property & selector, used for merging later
    const computedKey = selector + atRulesToString(atRules) + property;
    // "key" can be really long as it includes selectors, we use hashes to reduce sizes of keys
    // ".foo :hover" => "abcd"
    const hashedKey = (0, _hash.default)(computedKey);
    // As these hashes are used as object keys in build output we should avoid having numbers as a first character to
    // avoid having quotes:
    // {
    //   "1abc": {}, // we don't want this
    //   Aabc: {}, // no quotes
    // }
    const firstCharCode = hashedKey.charCodeAt(0);
    const startsWithNumber = firstCharCode >= 48 && firstCharCode <= 57;
    if (startsWithNumber) {
        return String.fromCharCode(firstCharCode + 17) + hashedKey.slice(1);
    }
    return hashedKey;
} //# sourceMappingURL=hashPropertyKey.js.map
