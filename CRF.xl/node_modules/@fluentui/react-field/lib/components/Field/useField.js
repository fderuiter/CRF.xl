'use client';
import * as React from 'react';
import { CheckmarkCircle12Filled, DiamondDismiss12Filled, Warning12Filled } from '@fluentui/react-icons';
import { Label } from '@fluentui/react-label';
import { slot } from '@fluentui/react-utilities';
import { useFieldBase_unstable } from './useFieldBase';
const validationMessageIcons = {
    error: /*#__PURE__*/ React.createElement(DiamondDismiss12Filled, null),
    warning: /*#__PURE__*/ React.createElement(Warning12Filled, null),
    success: /*#__PURE__*/ React.createElement(CheckmarkCircle12Filled, null),
    none: undefined
};
/**
 * Create the state required to render Field.
 *
 * The returned state can be modified with hooks such as useFieldStyles_unstable,
 * before being passed to renderField_unstable.
 *
 * @param props - Props passed to this field
 * @param ref - Ref to the root
 */ export const useField_unstable = (props, ref)=>{
    const { orientation = 'vertical', size = 'medium', ...fieldProps } = props;
    const state = useFieldBase_unstable(fieldProps, ref);
    const defaultIcon = validationMessageIcons[state.validationState];
    return {
        ...state,
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        components: {
            ...state.components,
            label: Label
        },
        label: slot.optional(props.label, {
            defaultProps: {
                size,
                ...state.label
            },
            elementType: Label
        }),
        validationMessageIcon: slot.optional(props.validationMessageIcon, {
            renderByDefault: !!defaultIcon,
            defaultProps: {
                children: defaultIcon
            },
            elementType: 'span'
        }),
        orientation,
        size
    };
};
