'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMenuListContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useMenuListContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useMenuListContextValues_unstable(state) {
    const { checkedValues, hasCheckmarks, hasIcons, selectRadio, setFocusByFirstCharacter, toggleCheckbox } = state;
    const menuList = _react.useMemo(()=>({
            checkedValues,
            hasCheckmarks,
            hasIcons,
            selectRadio,
            setFocusByFirstCharacter,
            toggleCheckbox
        }), [
        checkedValues,
        hasCheckmarks,
        hasIcons,
        selectRadio,
        setFocusByFirstCharacter,
        toggleCheckbox
    ]);
    return {
        menuList
    };
}
