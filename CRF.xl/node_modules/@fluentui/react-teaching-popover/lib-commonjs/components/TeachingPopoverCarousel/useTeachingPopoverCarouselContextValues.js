'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTeachingPopoverCarouselContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useTeachingPopoverCarouselContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useTeachingPopoverCarouselContextValues_unstable(state) {
    const { store, value, selectPageByValue, selectPageByDirection } = state;
    const carousel = _react.useMemo(()=>({
            store,
            value,
            selectPageByDirection,
            selectPageByValue
        }), [
        store,
        value,
        selectPageByDirection,
        selectPageByValue
    ]);
    return {
        carousel
    };
}
