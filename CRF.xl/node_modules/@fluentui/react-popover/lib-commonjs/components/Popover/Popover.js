'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Popover", {
    enumerable: true,
    get: function() {
        return Popover;
    }
});
const _usePopover = require("./usePopover");
const _usePopoverContextValues = require("./usePopoverContextValues");
const _renderPopover = require("./renderPopover");
const Popover = (props)=>{
    const state = (0, _usePopover.usePopover_unstable)(props);
    const contextValues = (0, _usePopoverContextValues.usePopoverContextValues_unstable)(state);
    return (0, _renderPopover.renderPopover_unstable)(state, contextValues);
};
Popover.displayName = 'Popover';
