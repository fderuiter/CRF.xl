'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DialogTrigger", {
    enumerable: true,
    get: function() {
        return DialogTrigger;
    }
});
const _useDialogTrigger = require("./useDialogTrigger");
const _renderDialogTrigger = require("./renderDialogTrigger");
const DialogTrigger = (props)=>{
    const state = (0, _useDialogTrigger.useDialogTrigger_unstable)(props);
    return (0, _renderDialogTrigger.renderDialogTrigger_unstable)(state);
};
DialogTrigger.displayName = 'DialogTrigger';
// type casting here is required to ensure internal type FluentTriggerComponent is not leaked
DialogTrigger.isFluentTriggerComponent = true;
