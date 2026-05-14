'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTreeItemContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useTreeItemContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useTreeItemContextValues_unstable(state) {
    const { value, itemType, layoutRef, subtreeRef, open, expandIconRef, actionsRef, treeItemRef, isActionsVisible, isAsideVisible, selectionRef, checked } = state;
    const treeItem = _react.useMemo(()=>({
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
