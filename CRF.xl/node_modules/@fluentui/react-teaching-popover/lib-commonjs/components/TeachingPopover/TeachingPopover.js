'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TeachingPopover", {
    enumerable: true,
    get: function() {
        return TeachingPopover;
    }
});
const _useTeachingPopover = require("./useTeachingPopover");
const _renderTeachingPopover = require("./renderTeachingPopover");
const _useTeachingPopoverContextValues = require("./useTeachingPopoverContextValues");
const TeachingPopover = (props)=>{
    const state = (0, _useTeachingPopover.useTeachingPopover_unstable)(props);
    const contextValues = (0, _useTeachingPopoverContextValues.useTeachingPopoverContextValues_unstable)(state);
    return (0, _renderTeachingPopover.renderTeachingPopover_unstable)(state, contextValues);
};
TeachingPopover.displayName = 'TeachingPopover';
