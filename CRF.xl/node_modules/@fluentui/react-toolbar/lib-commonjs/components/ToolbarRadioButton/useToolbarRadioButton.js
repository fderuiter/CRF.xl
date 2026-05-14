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
    useToolbarRadioButtonBase_unstable: function() {
        return useToolbarRadioButtonBase_unstable;
    },
    useToolbarRadioButton_unstable: function() {
        return useToolbarRadioButton_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _reactbutton = require("@fluentui/react-button");
const _ToolbarContext = require("../Toolbar/ToolbarContext");
const useToolbarRadioButton_unstable = (props, ref)=>{
    const contextSize = (0, _ToolbarContext.useToolbarContext_unstable)((ctx)=>ctx.size);
    const { appearance = 'subtle', size = contextSize, ...baseProps } = props;
    const state = useToolbarRadioButtonBase_unstable(baseProps, ref);
    return {
        ...state,
        appearance,
        size,
        shape: 'rounded'
    };
};
const useToolbarRadioButtonBase_unstable = (props, ref)=>{
    const handleRadio = (0, _ToolbarContext.useToolbarContext_unstable)((ctx)=>ctx.handleRadio);
    const checked = (0, _ToolbarContext.useToolbarContext_unstable)((ctx)=>{
        var _ctx_checkedValues_props_name;
        return !!((_ctx_checkedValues_props_name = ctx.checkedValues[props.name]) === null || _ctx_checkedValues_props_name === void 0 ? void 0 : _ctx_checkedValues_props_name.includes(props.value));
    });
    const { onClick: onClickOriginal } = props;
    const toggleButtonState = (0, _reactbutton.useToggleButtonBase_unstable)({
        checked,
        role: 'radio',
        'aria-checked': checked,
        ...props
    }, ref);
    const state = {
        ...toggleButtonState,
        name: props.name,
        value: props.value
    };
    const handleOnClick = (0, _reactutilities.useEventCallback)((e)=>{
        handleRadio === null || handleRadio === void 0 ? void 0 : handleRadio(e, state.name, state.value, state.checked);
        onClickOriginal === null || onClickOriginal === void 0 ? void 0 : onClickOriginal(e);
    });
    state.root['aria-pressed'] = undefined;
    state.root.onClick = handleOnClick;
    return state;
};
