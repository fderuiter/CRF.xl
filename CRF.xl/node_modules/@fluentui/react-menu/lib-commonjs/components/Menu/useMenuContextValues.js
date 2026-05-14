'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMenuContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useMenuContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useMenuContextValues_unstable(state) {
    const { checkedValues, hasCheckmarks, hasIcons, inline, isSubmenu, menuPopoverRef, mountNode, onCheckedValueChange, open, openOnContext, openOnHover, persistOnItemClick, safeZone, setOpen, triggerId, triggerRef } = state;
    const menu = _react.useMemo(()=>({
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
