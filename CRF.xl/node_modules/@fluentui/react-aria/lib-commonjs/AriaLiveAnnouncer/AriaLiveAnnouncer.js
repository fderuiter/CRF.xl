'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AriaLiveAnnouncer", {
    enumerable: true,
    get: function() {
        return AriaLiveAnnouncer;
    }
});
const _renderAriaLiveAnnouncer = require("./renderAriaLiveAnnouncer");
const _useAriaLiveAnnouncer = require("./useAriaLiveAnnouncer");
const _useAriaLiveAnnouncerContextValues = require("./useAriaLiveAnnouncerContextValues");
const AriaLiveAnnouncer = (props)=>{
    const state = (0, _useAriaLiveAnnouncer.useAriaLiveAnnouncer_unstable)(props);
    const contextValues = (0, _useAriaLiveAnnouncerContextValues.useAriaLiveAnnouncerContextValues_unstable)(state);
    return (0, _renderAriaLiveAnnouncer.renderAriaLiveAnnouncer_unstable)(state, contextValues);
};
AriaLiveAnnouncer.displayName = 'AriaLiveAnnouncer';
