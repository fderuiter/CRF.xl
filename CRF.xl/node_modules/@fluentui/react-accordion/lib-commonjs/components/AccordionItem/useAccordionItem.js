'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useAccordionItem_unstable", {
    enumerable: true,
    get: function() {
        return useAccordionItem_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _accordion = require("../../contexts/accordion");
const useAccordionItem_unstable = (props, ref)=>{
    const { value, disabled = false, ...rest } = props;
    const requestToggle = (0, _accordion.useAccordionContext_unstable)((ctx)=>ctx.requestToggle);
    const open = (0, _accordion.useAccordionContext_unstable)((ctx)=>ctx.openItems.includes(value));
    const onAccordionHeaderClick = (0, _reactutilities.useEventCallback)((event)=>requestToggle({
            event,
            value
        }));
    return {
        open,
        value,
        disabled,
        onHeaderClick: onAccordionHeaderClick,
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always({
            disabled,
            ref: ref,
            ...rest
        }, {
            elementType: 'div'
        })
    };
};
