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
    useBreadcrumbItemBase_unstable: function() {
        return useBreadcrumbItemBase_unstable;
    },
    useBreadcrumbItem_unstable: function() {
        return useBreadcrumbItem_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _BreadcrumbContext = require("../Breadcrumb/BreadcrumbContext");
const useBreadcrumbItem_unstable = (props, ref)=>{
    const { size } = (0, _BreadcrumbContext.useBreadcrumbContext_unstable)();
    const state = useBreadcrumbItemBase_unstable(props, ref);
    return {
        ...state,
        size
    };
};
const useBreadcrumbItemBase_unstable = (props, ref)=>{
    return {
        components: {
            root: 'li'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('li', {
            ref,
            ...props
        }), {
            elementType: 'li'
        })
    };
};
