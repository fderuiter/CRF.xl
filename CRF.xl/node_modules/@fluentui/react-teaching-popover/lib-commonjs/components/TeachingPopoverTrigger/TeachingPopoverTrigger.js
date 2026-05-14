'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TeachingPopoverTrigger", {
    enumerable: true,
    get: function() {
        return TeachingPopoverTrigger;
    }
});
const _renderTeachingPopoverTrigger = require("./renderTeachingPopoverTrigger");
const _useTeachingPopoverTrigger = require("./useTeachingPopoverTrigger");
const TeachingPopoverTrigger = (props)=>{
    const state = (0, _useTeachingPopoverTrigger.useTeachingPopoverTrigger_unstable)(props);
    return (0, _renderTeachingPopoverTrigger.renderTeachingPopoverTrigger_unstable)(state);
};
TeachingPopoverTrigger.displayName = 'TeachingPopoverTrigger';
// type casting here is required to ensure internal type FluentTriggerComponent is not leaked
TeachingPopoverTrigger.isFluentTriggerComponent = true;
