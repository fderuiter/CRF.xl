'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMessageBarActions_unstable", {
    enumerable: true,
    get: function() {
        return useMessageBarActions_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _messageBarContext = require("../../contexts/messageBarContext");
const useMessageBarActions_unstable = (props, ref)=>{
    const { layout = 'singleline', actionsRef } = (0, _messageBarContext.useMessageBarContext)();
    return {
        components: {
            root: 'div',
            containerAction: 'div'
        },
        containerAction: _reactutilities.slot.optional(props.containerAction, {
            renderByDefault: false,
            elementType: 'div'
        }),
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            ref: (0, _reactutilities.useMergedRefs)(ref, actionsRef),
            ...props
        }), {
            elementType: 'div'
        }),
        layout,
        hasActions: !!props.children
    };
};
