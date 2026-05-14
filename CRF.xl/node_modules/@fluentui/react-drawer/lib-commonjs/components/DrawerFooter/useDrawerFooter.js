'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDrawerFooter_unstable", {
    enumerable: true,
    get: function() {
        return useDrawerFooter_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _drawerContext = require("../../contexts/drawerContext");
const useDrawerFooter_unstable = (props, ref)=>{
    const { scrollState } = (0, _drawerContext.useDrawerContext_unstable)();
    return {
        components: {
            root: 'footer'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('footer', {
            ref,
            role: 'none',
            ...props
        }), {
            elementType: 'footer'
        }),
        scrollState
    };
};
