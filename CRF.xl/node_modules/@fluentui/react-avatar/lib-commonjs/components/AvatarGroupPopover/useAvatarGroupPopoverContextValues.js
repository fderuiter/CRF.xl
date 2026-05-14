'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useAvatarGroupPopoverContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useAvatarGroupPopoverContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useAvatarGroupPopoverContextValues_unstable = (state)=>{
    const avatarGroup = _react.useMemo(()=>({
            isOverflow: true,
            size: 24
        }), []);
    return {
        avatarGroup
    };
};
