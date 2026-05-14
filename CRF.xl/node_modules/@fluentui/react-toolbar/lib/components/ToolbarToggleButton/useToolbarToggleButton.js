'use client';
import { useToggleButtonBase_unstable } from '@fluentui/react-button';
import { useToolbarContext_unstable } from '../Toolbar/ToolbarContext';
/**
 * Given user props, defines default props for the ToggleButton, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the ToggleButton component.
 * @param ref - User provided ref to be passed to the ToggleButton component.
 */ export const useToolbarToggleButton_unstable = (props, ref)=>{
    const contextSize = useToolbarContext_unstable((ctx)=>ctx.size);
    const { appearance = 'subtle', size = contextSize !== null && contextSize !== void 0 ? contextSize : 'medium', ...baseProps } = props;
    const state = useToolbarToggleButtonBase_unstable(baseProps, ref);
    return {
        ...state,
        appearance,
        size,
        shape: 'rounded'
    };
};
/**
 * Base hook that builds Toolbar ToggleButton state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the ToggleButton component.
 * @param ref - User provided ref to be passed to the ToggleButton component.
 */ export const useToolbarToggleButtonBase_unstable = (props, ref)=>{
    const handleToggleButton = useToolbarContext_unstable((ctx)=>ctx.handleToggleButton);
    const checked = useToolbarContext_unstable((ctx)=>{
        var _ctx_checkedValues_props_name;
        return !!((_ctx_checkedValues_props_name = ctx.checkedValues[props.name]) === null || _ctx_checkedValues_props_name === void 0 ? void 0 : _ctx_checkedValues_props_name.includes(props.value));
    });
    const { onClick: onClickOriginal } = props;
    const toggleButtonState = useToggleButtonBase_unstable({
        checked,
        ...props
    }, ref);
    const state = {
        ...toggleButtonState,
        name: props.name,
        value: props.value
    };
    const handleOnClick = (e)=>{
        if (state.disabled || state.disabledFocusable) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        handleToggleButton === null || handleToggleButton === void 0 ? void 0 : handleToggleButton(e, state.name, state.value, state.checked);
        onClickOriginal === null || onClickOriginal === void 0 ? void 0 : onClickOriginal(e);
    };
    state.root.onClick = handleOnClick;
    return state;
};
