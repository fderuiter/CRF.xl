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
    useToggleButtonBase_unstable: function() {
        return useToggleButtonBase_unstable;
    },
    useToggleButton_unstable: function() {
        return useToggleButton_unstable;
    }
});
const _useToggleState = require("../../utils/useToggleState");
const _useButton = require("../Button/useButton");
const useToggleButton_unstable = (props, ref)=>{
    const { checked = false, defaultChecked = false, isAccessible = false, ...buttonProps } = props;
    const buttonState = (0, _useButton.useButton_unstable)(buttonProps, ref);
    return (0, _useToggleState.useToggleState)(props, buttonState);
};
const useToggleButtonBase_unstable = (props, ref)=>{
    const { checked = false, defaultChecked = false, isAccessible = false, ...buttonProps } = props;
    const buttonState = (0, _useButton.useButtonBase_unstable)(buttonProps, ref);
    return (0, _useToggleState.useToggleState)(props, buttonState);
};
