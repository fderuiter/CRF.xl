'use client';
import { useDividerBase_unstable } from '@fluentui/react-divider';
import { useToolbarContext_unstable } from '../Toolbar/ToolbarContext';
/**
 * Create the state required to render ToolbarDivider.
 *
 * The returned state can be modified with hooks such as useToolbarDividerStyles_unstable,
 * before being passed to renderToolbar_unstable.
 *
 * @param props - props from this instance of ToolbarDivider
 * @param ref - reference to root HTMLElement of ToolbarDivider
 */ export const useToolbarDivider_unstable = (props, ref)=>{
    const state = useToolbarDividerBase_unstable(props, ref);
    return {
        alignContent: 'center',
        appearance: 'default',
        inset: false,
        ...state
    };
};
/**
 * Base hook that builds ToolbarDivider state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - props from this instance of ToolbarDivider
 * @param ref - reference to root HTMLElement of ToolbarDivider
 */ export const useToolbarDividerBase_unstable = (props, ref)=>{
    const vertical = useToolbarContext_unstable((ctx)=>ctx.vertical);
    return useDividerBase_unstable({
        vertical: !vertical,
        ...props
    }, ref);
};
