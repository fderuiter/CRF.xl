"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isAtRuleElement", {
    enumerable: true,
    get: function() {
        return isAtRuleElement;
    }
});
const _stylis = require("stylis");
function isAtRuleElement(element) {
    switch(element.type){
        case '@container':
        case _stylis.MEDIA:
        case _stylis.SUPPORTS:
        case _stylis.LAYER:
            return true;
    }
    return false;
} //# sourceMappingURL=isAtRuleElement.js.map
