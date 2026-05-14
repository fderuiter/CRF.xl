'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useAccordionContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useAccordionContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
function useAccordionContextValues_unstable(state) {
    const { navigation, openItems, requestToggle, multiple, collapsible } = state;
    const accordion = _react.useMemo(()=>({
            navigation,
            openItems,
            requestToggle,
            collapsible,
            multiple
        }), [
        navigation,
        openItems,
        requestToggle,
        collapsible,
        multiple
    ]);
    return {
        accordion
    };
}
