'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "usePopoverContextValues_unstable", {
    enumerable: true,
    get: function() {
        return usePopoverContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function usePopoverContextValues_unstable(state) {
    const { appearance, arrowRef, contentRef, inline, mountNode, open, openOnContext, openOnHover, setOpen, size, toggleOpen, trapFocus, triggerRef, withArrow, inertTrapFocus } = state;
    const popover = _react.useMemo(()=>({
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
