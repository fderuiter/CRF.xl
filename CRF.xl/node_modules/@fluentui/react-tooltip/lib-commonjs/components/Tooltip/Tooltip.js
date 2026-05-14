'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Tooltip", {
    enumerable: true,
    get: function() {
        return Tooltip;
    }
});
const _useTooltip = require("./useTooltip");
const _renderTooltip = require("./renderTooltip");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useTooltipStylesstyles = require("./useTooltipStyles.styles");
const Tooltip = (props)=>{
    const state = (0, _useTooltip.useTooltip_unstable)(props);
    (0, _useTooltipStylesstyles.useTooltipStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useTooltipStyles_unstable')(state);
    return (0, _renderTooltip.renderTooltip_unstable)(state);
};
Tooltip.displayName = 'Tooltip';
// type casting here is required to ensure internal type FluentTriggerComponent is not leaked
Tooltip.isFluentTriggerComponent = true;
