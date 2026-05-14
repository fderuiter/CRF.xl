'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDrawerHeader_unstable", {
    enumerable: true,
    get: function() {
        return useDrawerHeader_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _drawerContext = require("../../contexts/drawerContext");
const useDrawerHeader_unstable = (props, ref)=>{
    const { scrollState } = (0, _drawerContext.useDrawerContext_unstable)();
    return {
        components: {
            root: 'header'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('header', {
            ref,
            role: 'none',
            ...props
        }), {
            elementType: 'header'
        }),
        scrollState
    };
};
