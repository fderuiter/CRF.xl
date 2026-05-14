'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useSwatchPickerContextValues", {
    enumerable: true,
    get: function() {
        return useSwatchPickerContextValues;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useSwatchPickerContextValues = (state)=>{
    const { isGrid, size, shape, spacing, requestSelectionChange, selectedValue } = state;
    const swatchPicker = _react.useMemo(()=>({
            isGrid,
            size,
            shape,
            spacing,
            selectedValue,
            requestSelectionChange
        }), [
        isGrid,
        size,
        shape,
        spacing,
        selectedValue,
        requestSelectionChange
    ]);
    return {
        swatchPicker
    };
};
