'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useToolbarContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useToolbarContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useToolbarContextValues_unstable(state) {
    const { size, handleToggleButton, vertical, checkedValues, handleRadio } = state;
    const toolbar = _react.useMemo(()=>({
            size,
            vertical,
            handleToggleButton,
            handleRadio,
            checkedValues
        }), [
        size,
        vertical,
        handleToggleButton,
        handleRadio,
        checkedValues
    ]);
    return {
        toolbar
    };
}
