'use client';
import * as React from 'react';
export function usePopoverContextValues_unstable(state) {
    const { appearance, arrowRef, contentRef, inline, mountNode, open, openOnContext, openOnHover, setOpen, size, toggleOpen, trapFocus, triggerRef, withArrow, inertTrapFocus } = state;
    const popover = React.useMemo(()=>({
            appearance,
            arrowRef,
            contentRef,
            inline,
            mountNode,
            open,
            openOnContext,
            openOnHover,
            setOpen,
            size,
            toggleOpen,
            trapFocus,
            triggerRef,
            withArrow,
            inertTrapFocus
        }), [
        appearance,
        arrowRef,
        contentRef,
        inline,
        mountNode,
        open,
        openOnContext,
        openOnHover,
        setOpen,
        size,
        toggleOpen,
        trapFocus,
        triggerRef,
        withArrow,
        inertTrapFocus
    ]);
    return {
        popover
    };
}
