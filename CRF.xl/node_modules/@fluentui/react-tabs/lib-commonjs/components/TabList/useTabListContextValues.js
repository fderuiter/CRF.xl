'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTabListContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useTabListContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useTabListContextValues_unstable(state) {
    const { appearance, reserveSelectedTabSpace, disabled, selectTabOnFocus, selectedValue: selectedKey, onRegister, onUnregister, onSelect, getRegisteredTabs, size, vertical } = state;
    const tabList = _react.useMemo(()=>({
            appearance,
            reserveSelectedTabSpace,
            disabled,
            selectTabOnFocus,
            selectedValue: selectedKey,
            onSelect,
            onRegister,
            onUnregister,
            getRegisteredTabs,
            size,
            vertical
        }), [
        appearance,
        reserveSelectedTabSpace,
        disabled,
        selectTabOnFocus,
        selectedKey,
        onSelect,
        onRegister,
        onUnregister,
        getRegisteredTabs,
        size,
        vertical
    ]);
    return {
        tabList
    };
}
