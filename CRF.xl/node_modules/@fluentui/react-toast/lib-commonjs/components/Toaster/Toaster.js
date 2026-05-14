'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Toaster", {
    enumerable: true,
    get: function() {
        return Toaster;
    }
});
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useToaster = require("./useToaster");
const _renderToaster = require("./renderToaster");
const _useToasterStylesstyles = require("./useToasterStyles.styles");
const Toaster = (props)=>{
    const state = (0, _useToaster.useToaster_unstable)(props);
    (0, _useToasterStylesstyles.useToasterStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useToasterStyles_unstable')(state);
    return (0, _renderToaster.renderToaster_unstable)(state);
};
Toaster.displayName = 'Toaster';
