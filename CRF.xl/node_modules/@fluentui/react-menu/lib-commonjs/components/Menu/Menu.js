'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Menu", {
    enumerable: true,
    get: function() {
        return Menu;
    }
});
const _useMenu = require("./useMenu");
const _useMenuContextValues = require("./useMenuContextValues");
const _renderMenu = require("./renderMenu");
const Menu = (props)=>{
    const state = (0, _useMenu.useMenu_unstable)(props);
    const contextValues = (0, _useMenuContextValues.useMenuContextValues_unstable)(state);
    return (0, _renderMenu.renderMenu_unstable)(state, contextValues);
};
Menu.displayName = 'Menu';
