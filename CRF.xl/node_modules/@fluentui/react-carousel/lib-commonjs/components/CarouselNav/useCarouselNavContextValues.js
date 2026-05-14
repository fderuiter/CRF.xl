'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useCarouselNavContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useCarouselNavContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useCarouselNavContextValues_unstable(state) {
    const { appearance } = state;
    const carouselNav = _react.useMemo(()=>({
            appearance
        }), [
        appearance
    ]);
    return {
        carouselNav
    };
}
