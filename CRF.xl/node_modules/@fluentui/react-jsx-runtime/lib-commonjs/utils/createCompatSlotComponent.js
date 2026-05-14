"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createCompatSlotComponent", {
    enumerable: true,
    get: function() {
        return createCompatSlotComponent;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
function createCompatSlotComponent(type, props) {
    return {
        ...props,
        [_reactutilities.SLOT_ELEMENT_TYPE_SYMBOL]: type
    };
}
