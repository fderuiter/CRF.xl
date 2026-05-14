"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMenuDivider_unstable", {
    enumerable: true,
    get: function() {
        return useMenuDivider_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useMenuDivider_unstable = (props, ref)=>{
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            role: 'presentation',
            'aria-hidden': true,
            ...props,
            // FIXME:
            // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
            // but since it would be a breaking change to fix it, we are casting ref to it's proper type
            ref: ref
        }), {
            elementType: 'div'
        })
    };
};
