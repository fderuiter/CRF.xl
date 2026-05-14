'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    useToolbarButtonBase_unstable: function() {
        return useToolbarButtonBase_unstable;
    },
    useToolbarButton_unstable: function() {
        return useToolbarButton_unstable;
    }
});
const _reactbutton = require("@fluentui/react-button");
const useToolbarButton_unstable = (props, ref)=>{
    const { appearance = 'subtle', ...baseProps } = props;
    const state = useToolbarButtonBase_unstable(baseProps, ref);
    return {
        appearance,
        size: 'medium',
        shape: 'rounded',
        ...state
    };
};
const useToolbarButtonBase_unstable = (props, ref)=>{
    const { vertical = false, ...buttonProps } = props;
    const state = (0, _reactbutton.useButtonBase_unstable)(buttonProps, ref);
    return {
        vertical,
        ...state
    };
};
