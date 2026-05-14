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
    useBreadcrumbButtonBase_unstable: function() {
        return useBreadcrumbButtonBase_unstable;
    },
    useBreadcrumbButton_unstable: function() {
        return useBreadcrumbButton_unstable;
    }
});
const _reactbutton = require("@fluentui/react-button");
const _BreadcrumbContext = require("../Breadcrumb/BreadcrumbContext");
const useBreadcrumbButton_unstable = (props, ref)=>{
    const { size } = (0, _BreadcrumbContext.useBreadcrumbContext_unstable)();
    const state = useBreadcrumbButtonBase_unstable(props, ref);
    return {
        appearance: 'subtle',
        size,
        shape: 'rounded',
        ...state
    };
};
const useBreadcrumbButtonBase_unstable = (props, ref)=>{
    const { current = false, as, ...rest } = props;
    const controlType = (as !== null && as !== void 0 ? as : props.href) ? 'a' : 'button';
    var _props_ariacurrent, _props_ariadisabled;
    const buttonState = (0, _reactbutton.useButtonBase_unstable)({
        role: undefined,
        type: undefined,
        as: controlType,
        iconPosition: 'before',
        'aria-current': current ? (_props_ariacurrent = props['aria-current']) !== null && _props_ariacurrent !== void 0 ? _props_ariacurrent : 'page' : undefined,
        'aria-disabled': current ? (_props_ariadisabled = props['aria-disabled']) !== null && _props_ariadisabled !== void 0 ? _props_ariadisabled : true : undefined,
        ...rest
    }, ref);
    return {
        ...buttonState,
        current
    };
};
