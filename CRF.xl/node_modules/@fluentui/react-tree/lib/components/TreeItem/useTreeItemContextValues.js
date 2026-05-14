'use client';
import * as React from 'react';
export function useTreeItemContextValues_unstable(state) {
    const { value, itemType, layoutRef, subtreeRef, open, expandIconRef, actionsRef, treeItemRef, // eslint-disable-next-line @typescript-eslint/no-deprecated
    isActionsVisible, // eslint-disable-next-line @typescript-eslint/no-deprecated
    isAsideVisible, selectionRef, checked } = state;
    const treeItem = React.useMemo(()=>({
            value,
            checked,
            itemType,
            layoutRef,
            subtreeRef,
            open,
            selectionRef,
            isActionsVisible,
            isAsideVisible,
            actionsRef,
            treeItemRef,
            expandIconRef
        }), [
        value,
        checked,
        itemType,
        layoutRef,
        subtreeRef,
        open,
        selectionRef,
        isActionsVisible,
        isAsideVisible,
        actionsRef,
        treeItemRef,
        expandIconRef
    ]);
    return {
        treeItem
    };
}
