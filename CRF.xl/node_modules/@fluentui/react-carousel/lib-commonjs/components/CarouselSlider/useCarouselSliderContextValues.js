'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useCarouselSliderContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useCarouselSliderContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useCarouselSliderContextValues_unstable(state) {
    const { cardFocus } = state;
    const carouselSlider = _react.useMemo(()=>({
            cardFocus
        }), [
        cardFocus
    ]);
    return {
        carouselSlider
    };
}
