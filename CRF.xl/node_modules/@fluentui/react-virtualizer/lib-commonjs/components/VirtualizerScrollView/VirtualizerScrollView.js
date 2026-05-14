'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VirtualizerScrollView", {
    enumerable: true,
    get: function() {
        return VirtualizerScrollView;
    }
});
const _useVirtualizerScrollView = require("./useVirtualizerScrollView");
const _renderVirtualizerScrollView = require("./renderVirtualizerScrollView");
const _useVirtualizerScrollViewStylesstyles = require("./useVirtualizerScrollViewStyles.styles");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const VirtualizerScrollView = (props)=>{
    const state = (0, _useVirtualizerScrollView.useVirtualizerScrollView_unstable)(props);
    (0, _useVirtualizerScrollViewStylesstyles.useVirtualizerScrollViewStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useVirtualizerScrollViewStyles_unstable')(state);
    return (0, _renderVirtualizerScrollView.renderVirtualizerScrollView_unstable)(state);
};
VirtualizerScrollView.displayName = 'VirtualizerScrollView';
