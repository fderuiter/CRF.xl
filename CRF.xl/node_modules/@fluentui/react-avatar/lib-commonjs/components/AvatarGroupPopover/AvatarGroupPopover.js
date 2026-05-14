'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AvatarGroupPopover", {
    enumerable: true,
    get: function() {
        return AvatarGroupPopover;
    }
});
const _renderAvatarGroupPopover = require("./renderAvatarGroupPopover");
const _useAvatarGroupPopoverContextValues = require("./useAvatarGroupPopoverContextValues");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useAvatarGroupPopover = require("./useAvatarGroupPopover");
const _useAvatarGroupPopoverStylesstyles = require("./useAvatarGroupPopoverStyles.styles");
const AvatarGroupPopover = (props)=>{
    const state = (0, _useAvatarGroupPopover.useAvatarGroupPopover_unstable)(props);
    const contextValues = (0, _useAvatarGroupPopoverContextValues.useAvatarGroupPopoverContextValues_unstable)(state);
    (0, _useAvatarGroupPopoverStylesstyles.useAvatarGroupPopoverStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useAvatarGroupPopoverStyles_unstable')(state);
    return (0, _renderAvatarGroupPopover.renderAvatarGroupPopover_unstable)(state, contextValues);
};
AvatarGroupPopover.displayName = 'AvatarGroupPopover';
