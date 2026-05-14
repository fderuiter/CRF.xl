'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AriaLive", {
    enumerable: true,
    get: function() {
        return AriaLive;
    }
});
const _useAriaLive = require("./useAriaLive");
const _renderAriaLive = require("./renderAriaLive");
const _useAriaLiveStylesstyles = require("./useAriaLiveStyles.styles");
const AriaLive = (props)=>{
    const state = (0, _useAriaLive.useAriaLive_unstable)(props);
    (0, _useAriaLiveStylesstyles.useAriaLiveStyles_unstable)(state);
    return (0, _renderAriaLive.renderAriaLive_unstable)(state);
};
AriaLive.displayName = 'AriaLive';
