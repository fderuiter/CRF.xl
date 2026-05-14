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
    defaultAvatarGroupSize: function() {
        return defaultAvatarGroupSize;
    },
    useAvatarGroupBase_unstable: function() {
        return useAvatarGroupBase_unstable;
    },
    useAvatarGroup_unstable: function() {
        return useAvatarGroup_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useAvatarGroup_unstable = (props, ref)=>{
    const { size = defaultAvatarGroupSize, ...baseProps } = props;
    const state = useAvatarGroupBase_unstable(baseProps, ref);
    return {
        size,
        ...state
    };
};
const useAvatarGroupBase_unstable = (props, ref)=>{
    const { layout = 'spread' } = props;
    const root = _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
        role: 'group',
        ...props,
        ref
    }), {
        elementType: 'div'
    });
    return {
        layout,
        components: {
            root: 'div'
        },
        root
    };
};
const defaultAvatarGroupSize = 32;
