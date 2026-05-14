"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "hyphenateProperty", {
    enumerable: true,
    get: function() {
        return hyphenateProperty;
    }
});
const uppercasePattern = /[A-Z]/g;
const msPattern = /^ms-/;
const cache = {};
function toHyphenLower(match) {
    return '-' + match.toLowerCase();
}
function hyphenateProperty(name) {
    if (Object.prototype.hasOwnProperty.call(cache, name)) {
        return cache[name];
    }
    if (name.substr(0, 2) === '--') {
        return name;
    }
    const hName = name.replace(uppercasePattern, toHyphenLower);
    return cache[name] = msPattern.test(hName) ? '-' + hName : hName;
} //# sourceMappingURL=hyphenateProperty.js.map
