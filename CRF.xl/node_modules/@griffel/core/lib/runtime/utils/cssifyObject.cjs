"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "cssifyObject", {
    enumerable: true,
    get: function() {
        return cssifyObject;
    }
});
const _hyphenateProperty = require("./hyphenateProperty.cjs");
function cssifyObject(style) {
    let css = '';
    // eslint-disable-next-line guard-for-in
    for(const property in style){
        const value = style[property];
        if (typeof value === 'string' || typeof value === 'number') {
            css += (0, _hyphenateProperty.hyphenateProperty)(property) + ':' + value + ';';
            continue;
        }
        if (Array.isArray(value)) {
            for (const arrValue of value){
                css += (0, _hyphenateProperty.hyphenateProperty)(property) + ':' + arrValue + ';';
            }
        }
    }
    return css;
} //# sourceMappingURL=cssifyObject.js.map
