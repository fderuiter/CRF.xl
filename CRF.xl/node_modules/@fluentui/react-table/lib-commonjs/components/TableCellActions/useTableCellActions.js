"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTableCellActions_unstable", {
    enumerable: true,
    get: function() {
        return useTableCellActions_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useTableCellActions_unstable = (props, ref)=>{
    var _props_visible;
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            // FIXME:
            // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
            // but since it would be a breaking change to fix it, we are casting ref to it's proper type
            ref: ref,
            ...props
        }), {
            elementType: 'div'
        }),
        visible: (_props_visible = props.visible) !== null && _props_visible !== void 0 ? _props_visible : false
    };
};
