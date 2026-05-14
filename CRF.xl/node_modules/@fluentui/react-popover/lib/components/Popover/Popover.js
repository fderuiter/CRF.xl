'use client';
import { usePopover_unstable } from './usePopover';
import { usePopoverContextValues_unstable } from './usePopoverContextValues';
import { renderPopover_unstable } from './renderPopover';
/**
 * Wrapper component that manages state for a PopoverTrigger and a PopoverSurface components.
 */ export const Popover = (props)=>{
    const state = usePopover_unstable(props);
    const contextValues = usePopoverContextValues_unstable(state);
    return renderPopover_unstable(state, contextValues);
};
Popover.displayName = 'Popover';
