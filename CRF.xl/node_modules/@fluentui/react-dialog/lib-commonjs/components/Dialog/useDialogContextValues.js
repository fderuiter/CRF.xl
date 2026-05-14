'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDialogContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useDialogContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useDialogContextValues_unstable(state) {
    const { modalType, open, dialogRef, dialogTitleId, isNestedDialog, inertTrapFocus, requestOpenChange, modalAttributes, triggerAttributes, unmountOnClose } = state;
    const dialog = _react.useMemo(()=>({
            open,
            modalType,
            dialogRef,
            dialogTitleId,
            isNestedDialog,
            inertTrapFocus,
            modalAttributes,
            triggerAttributes,
            unmountOnClose,
            requestOpenChange
        }), [
        open,
        modalType,
        dialogRef,
        dialogTitleId,
        isNestedDialog,
        inertTrapFocus,
        modalAttributes,
        triggerAttributes,
        unmountOnClose,
        requestOpenChange
    ]);
    const dialogSurface = false;
    return {
        dialog,
        dialogSurface
    };
}
