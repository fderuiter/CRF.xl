'use client';
import { useButtonBase_unstable } from '@fluentui/react-button';
/**
 * Given user props, defines default props for the Button, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the Button component.
 * @param ref - User provided ref to be passed to the Button component.
 */ export const useToolbarButton_unstable = (props, ref)=>{
    const { appearance = 'subtle', ...baseProps } = props;
    const state = useToolbarButtonBase_unstable(baseProps, ref);
    return {
        appearance,
        size: 'medium',
        shape: 'rounded',
        ...state
    };
};
/**
 * Base hook that builds Toolbar Button state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the Button component.
 * @param ref - User provided ref to be passed to the Button component.
 */ export const useToolbarButtonBase_unstable = (props, ref)=>{
    const { vertical = false, ...buttonProps } = props;
    const state = useButtonBase_unstable(buttonProps, ref);
    return {
        vertical,
        ...state
    };
};
