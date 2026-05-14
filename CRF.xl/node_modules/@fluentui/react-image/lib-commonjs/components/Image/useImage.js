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
    useImageBase_unstable: function() {
        return useImageBase_unstable;
    },
    useImage_unstable: function() {
        return useImage_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useImage_unstable = (props, ref)=>{
    const { bordered = false, block = false, fit = 'default', shadow = false, shape = 'square', ...imageProps } = props;
    const state = useImageBase_unstable(imageProps, ref);
    return {
        bordered,
        block,
        fit,
        shadow,
        shape,
        ...state
    };
};
const useImageBase_unstable = (props, ref)=>{
    return {
        components: {
            root: 'img'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('img', {
            ref,
            ...props
        }), {
            elementType: 'img'
        })
    };
};
