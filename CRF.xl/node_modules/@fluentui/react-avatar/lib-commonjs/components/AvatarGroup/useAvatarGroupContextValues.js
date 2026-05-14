'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useAvatarGroupContextValues", {
    enumerable: true,
    get: function() {
        return useAvatarGroupContextValues;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useAvatarGroupContextValues = (state)=>{
    const { layout, size } = state;
    const avatarGroup = _react.useMemo(()=>({
            layout,
            size
        }), [
        layout,
        size
    ]);
    return {
        avatarGroup
    };
};
