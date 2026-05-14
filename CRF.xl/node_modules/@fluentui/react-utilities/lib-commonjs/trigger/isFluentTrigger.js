"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isFluentTrigger", {
    enumerable: true,
    get: function() {
        return isFluentTrigger;
    }
});
function isFluentTrigger(element) {
    return Boolean(element.type.isFluentTriggerComponent);
}
