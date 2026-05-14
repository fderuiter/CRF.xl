'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    useToolbarDividerBase_unstable: function() {
        return useToolbarDividerBase_unstable;
    },
    useToolbarDivider_unstable: function() {
        return useToolbarDivider_unstable;
    }
});
const _reactdivider = require("@fluentui/react-divider");
const _ToolbarContext = require("../Toolbar/ToolbarContext");
const useToolbarDivider_unstable = (props, ref)=>{
    const state = useToolbarDividerBase_unstable(props, ref);
    return {
        alignContent: 'center',
        appearance: 'default',
        inset: false,
        ...state
    };
};
const useToolbarDividerBase_unstable = (props, ref)=>{
    const vertical = (0, _ToolbarContext.useToolbarContext_unstable)((ctx)=>ctx.vertical);
    return (0, _reactdivider.useDividerBase_unstable)({
        vertical: !vertical,
        ...props
    }, ref);
};
