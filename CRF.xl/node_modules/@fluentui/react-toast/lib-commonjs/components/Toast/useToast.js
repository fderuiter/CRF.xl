'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useToast_unstable", {
    enumerable: true,
    get: function() {
        return useToast_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _toastContainerContext = require("../../contexts/toastContainerContext");
const useToast_unstable = (props, ref)=>{
    const { intent } = (0, _toastContainerContext.useToastContainerContext)();
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
        backgroundAppearance: props.appearance,
        intent
    };
};
