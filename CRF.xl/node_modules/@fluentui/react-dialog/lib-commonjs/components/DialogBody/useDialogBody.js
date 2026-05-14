"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDialogBody_unstable", {
    enumerable: true,
    get: function() {
        return useDialogBody_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useDialogBody_unstable = (props, ref)=>{
    var _props_as;
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)((_props_as = props.as) !== null && _props_as !== void 0 ? _props_as : 'div', {
            // FIXME:
            // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
            // but since it would be a breaking change to fix it, we are casting ref to it's proper type
            ref: ref,
            ...props
        }), {
            elementType: 'div'
        })
    };
};
