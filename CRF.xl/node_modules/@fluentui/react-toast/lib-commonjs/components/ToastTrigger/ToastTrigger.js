'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ToastTrigger", {
    enumerable: true,
    get: function() {
        return ToastTrigger;
    }
});
const _useToastTrigger = require("./useToastTrigger");
const _renderToastTrigger = require("./renderToastTrigger");
const ToastTrigger = (props)=>{
    const state = (0, _useToastTrigger.useToastTrigger_unstable)(props);
    return (0, _renderToastTrigger.renderToastTrigger_unstable)(state);
};
ToastTrigger.displayName = 'ToastTrigger';
