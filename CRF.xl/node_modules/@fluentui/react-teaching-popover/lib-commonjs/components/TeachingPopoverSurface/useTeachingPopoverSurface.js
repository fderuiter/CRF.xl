'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTeachingPopoverSurface_unstable", {
    enumerable: true,
    get: function() {
        return useTeachingPopoverSurface_unstable;
    }
});
const _reactpopover = require("@fluentui/react-popover");
const useTeachingPopoverSurface_unstable = (props, ref)=>{
    const state = (0, _reactpopover.usePopoverSurface_unstable)(props, ref);
    return state;
};
