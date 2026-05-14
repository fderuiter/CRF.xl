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
    useCounterBadgeBase_unstable: function() {
        return useCounterBadgeBase_unstable;
    },
    useCounterBadge_unstable: function() {
        return useCounterBadge_unstable;
    }
});
const _index = require("../Badge/index");
const useCounterBadge_unstable = (props, ref)=>{
    const { shape = 'circular', appearance = 'filled', color = 'brand', size = 'medium', ...counterBadgeProps } = props;
    const state = useCounterBadgeBase_unstable(counterBadgeProps, ref);
    return {
        ...state,
        shape,
        appearance,
        color,
        size
    };
};
const useCounterBadgeBase_unstable = (props, ref)=>{
    const { showZero = false, overflowCount = 99, count = 0, dot = false, ...badgeProps } = props;
    const state = {
        ...(0, _index.useBadgeBase_unstable)(badgeProps, ref),
        showZero,
        count,
        dot
    };
    if ((count !== 0 || showZero) && !dot && !state.root.children) {
        state.root.children = count > overflowCount ? `${overflowCount}+` : `${count}`;
    }
    return state;
};
