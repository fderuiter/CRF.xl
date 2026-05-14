'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useFlatTreeContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useFlatTreeContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useFlatTreeContextValues_unstable = (state)=>{
    const { openItems, level, contextType, treeType, checkedItems, selectionMode, navigationMode, appearance, size, requestTreeResponse, forceUpdateRovingTabIndex } = state;
    const tree = _react.useMemo(()=>({
            treeType,
            size,
            openItems,
            appearance,
            checkedItems,
            selectionMode,
            navigationMode,
            contextType,
            level,
            requestTreeResponse,
            forceUpdateRovingTabIndex
        }), [
        treeType,
        size,
        openItems,
        appearance,
        checkedItems,
        selectionMode,
        navigationMode,
        contextType,
        level,
        requestTreeResponse,
        forceUpdateRovingTabIndex
    ]);
    return {
        tree
    };
};
