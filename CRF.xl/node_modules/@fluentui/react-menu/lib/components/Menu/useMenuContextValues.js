'use client';
import * as React from 'react';
export function useMenuContextValues_unstable(state) {
    const { checkedValues, hasCheckmarks, hasIcons, inline, isSubmenu, menuPopoverRef, mountNode, onCheckedValueChange, open, openOnContext, openOnHover, persistOnItemClick, safeZone, setOpen, triggerId, triggerRef } = state;
    const menu = React.useMemo(()=>({
            checkedValues,
            hasCheckmarks,
            hasIcons,
            inline,
            isSubmenu,
            menuPopoverRef,
            mountNode,
            onCheckedValueChange,
            open,
            openOnContext,
            openOnHover,
            persistOnItemClick,
            safeZone,
            setOpen,
            triggerId,
            triggerRef
        }), [
        checkedValues,
        hasCheckmarks,
        hasIcons,
        inline,
        isSubmenu,
        menuPopoverRef,
        mountNode,
        onCheckedValueChange,
        open,
        openOnContext,
        openOnHover,
        persistOnItemClick,
        safeZone,
        setOpen,
        triggerId,
        triggerRef
    ]);
    return {
        menu
    };
}
