'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MenuTrigger", {
    enumerable: true,
    get: function() {
        return MenuTrigger;
    }
});
const _useMenuTrigger = require("./useMenuTrigger");
const _renderMenuTrigger = require("./renderMenuTrigger");
const MenuTrigger = (props)=>{
    const state = (0, _useMenuTrigger.useMenuTrigger_unstable)(props);
    return (0, _renderMenuTrigger.renderMenuTrigger_unstable)(state);
};
MenuTrigger.displayName = 'MenuTrigger';
// type casting here is required to ensure internal type FluentTriggerComponent is not leaked
MenuTrigger.isFluentTriggerComponent = true;
