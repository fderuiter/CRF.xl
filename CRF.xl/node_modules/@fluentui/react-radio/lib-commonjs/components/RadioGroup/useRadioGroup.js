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
    useRadioGroupBase_unstable: function() {
        return useRadioGroupBase_unstable;
    },
    useRadioGroup_unstable: function() {
        return useRadioGroup_unstable;
    }
});
const _reactfield = require("@fluentui/react-field");
const _reactutilities = require("@fluentui/react-utilities");
const useRadioGroup_unstable = (props, ref)=>{
    const { layout = 'vertical', ...baseProps } = props;
    const state = useRadioGroupBase_unstable(baseProps, ref);
    return {
        layout,
        ...state
    };
};
const useRadioGroupBase_unstable = (props, ref)=>{
    // Merge props from surrounding <Field>, if any
    props = (0, _reactfield.useFieldControlProps_unstable)(props);
    const generatedName = (0, _reactutilities.useId)('radiogroup-');
    const { name = generatedName, value, defaultValue, disabled, onChange, required } = props;
    return {
        name,
        value,
        defaultValue,
        disabled,
        required,
        components: {
            root: 'div'
        },
        root: {
            ref,
            role: 'radiogroup',
            ..._reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', props, /*excludedPropNames:*/ [
                'onChange',
                'name'
            ]), {
                elementType: 'div'
            }),
            onChange: (0, _reactutilities.useEventCallback)((ev)=>{
                if (onChange && (0, _reactutilities.isHTMLElement)(ev.target, {
                    constructorName: 'HTMLInputElement'
                }) && ev.target.type === 'radio') {
                    onChange(ev, {
                        value: ev.target.value
                    });
                }
            })
        }
    };
};
