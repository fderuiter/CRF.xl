'use client';
import * as React from 'react';
export function useDialogContextValues_unstable(state) {
    const { modalType, open, dialogRef, dialogTitleId, isNestedDialog, inertTrapFocus, requestOpenChange, modalAttributes, triggerAttributes, unmountOnClose } = state;
    const dialog = React.useMemo(()=>({
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
