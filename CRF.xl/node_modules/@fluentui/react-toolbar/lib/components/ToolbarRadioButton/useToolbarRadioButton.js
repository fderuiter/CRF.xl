'use client';
import { useEventCallback } from '@fluentui/react-utilities';
import { useToggleButtonBase_unstable } from '@fluentui/react-button';
import { useToolbarContext_unstable } from '../Toolbar/ToolbarContext';
/**
 * Given user props, defines default props for the RadioButton, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the RadioButton component.
 * @param ref - User provided ref to be passed to the RadioButton component.
 */ export const useToolbarRadioButton_unstable = (props, ref)=>{
    const contextSize = useToolbarContext_unstable((ctx)=>ctx.size);
    const { appearance = 'subtle', size = contextSize, ...baseProps } = props;
    const state = useToolbarRadioButtonBase_unstable(baseProps, ref);
    return {
        ...state,
        appearance,
        size,
        shape: 'rounded'
    };
};
/**
 * Base hook that builds Toolbar RadioButton state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the RadioButton component.
 * @param ref - User provided ref to be passed to the RadioButton component.
 */ export const useToolbarRadioButtonBase_unstable = (props, ref)=>{
    const handleRadio = useToolbarContext_unstable((ctx)=>ctx.handleRadio);
    const checked = useToolbarContext_unstable((ctx)=>{
        var _ctx_checkedValues_props_name;
        return !!((_ctx_checkedValues_props_name = ctx.checkedValues[props.name]) === null || _ctx_checkedValues_props_name === void 0 ? void 0 : _ctx_checkedValues_props_name.includes(props.value));
    });
    const { onClick: onClickOriginal } = props;
    const toggleButtonState = useToggleButtonBase_unstable({
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
    const handleOnClick = useEventCallback((e)=>{
        handleRadio === null || handleRadio === void 0 ? void 0 : handleRadio(e, state.name, state.value, state.checked);
        onClickOriginal === null || onClickOriginal === void 0 ? void 0 : onClickOriginal(e);
    });
    state.root['aria-pressed'] = undefined;
    state.root.onClick = handleOnClick;
    return state;
};
