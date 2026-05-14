'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useField_unstable", {
    enumerable: true,
    get: function() {
        return useField_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reacticons = require("@fluentui/react-icons");
const _reactlabel = require("@fluentui/react-label");
const _reactutilities = require("@fluentui/react-utilities");
const _useFieldBase = require("./useFieldBase");
const validationMessageIcons = {
    error: /*#__PURE__*/ _react.createElement(_reacticons.DiamondDismiss12Filled, null),
    warning: /*#__PURE__*/ _react.createElement(_reacticons.Warning12Filled, null),
    success: /*#__PURE__*/ _react.createElement(_reacticons.CheckmarkCircle12Filled, null),
    none: undefined
};
const useField_unstable = (props, ref)=>{
    const { orientation = 'vertical', size = 'medium', ...fieldProps } = props;
    const state = (0, _useFieldBase.useFieldBase_unstable)(fieldProps, ref);
    const defaultIcon = validationMessageIcons[state.validationState];
    return {
        ...state,
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        components: {
            ...state.components,
            label: _reactlabel.Label
        },
        label: _reactutilities.slot.optional(props.label, {
            defaultProps: {
                size,
                ...state.label
            },
            elementType: _reactlabel.Label
        }),
        validationMessageIcon: _reactutilities.slot.optional(props.validationMessageIcon, {
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
