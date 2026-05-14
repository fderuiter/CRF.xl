'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useColorPickerContextValues", {
    enumerable: true,
    get: function() {
        return useColorPickerContextValues;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useColorPickerContextValues = (state)=>{
    const { color, shape, requestChange } = state;
    const colorPicker = _react.useMemo(()=>({
            requestChange,
            color,
            shape
        }), [
        requestChange,
        color,
        shape
    ]);
    return {
        colorPicker
    };
};
