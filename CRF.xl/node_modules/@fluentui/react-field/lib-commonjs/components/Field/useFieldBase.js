"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useFieldBase_unstable", {
    enumerable: true,
    get: function() {
        return useFieldBase_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useFieldBase_unstable = (props, ref)=>{
    const { children, required = false, validationState = props.validationMessage ? 'error' : 'none' } = props;
    const baseId = (0, _reactutilities.useId)('field-');
    const generatedControlId = baseId + '__control';
    const root = _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
        ...props,
        ref
    }, /*excludedPropNames:*/ [
        'children'
    ]), {
        elementType: 'div'
    });
    const label = _reactutilities.slot.optional(props.label, {
        defaultProps: {
            htmlFor: generatedControlId,
            id: baseId + '__label',
            required
        },
        elementType: 'label'
    });
    const validationMessage = _reactutilities.slot.optional(props.validationMessage, {
        defaultProps: {
            id: baseId + '__validationMessage',
            role: validationState === 'error' || validationState === 'warning' ? 'alert' : undefined
        },
        elementType: 'div'
    });
    const hint = _reactutilities.slot.optional(props.hint, {
        defaultProps: {
            id: baseId + '__hint'
        },
        elementType: 'div'
    });
    const validationMessageIcon = _reactutilities.slot.optional(props.validationMessageIcon, {
        renderByDefault: false,
        elementType: 'span'
    });
    return {
        children,
        generatedControlId,
        required,
        validationState,
        components: {
            root: 'div',
            label: 'label',
            validationMessage: 'div',
            validationMessageIcon: 'span',
            hint: 'div'
        },
        root,
        label,
        validationMessageIcon,
        validationMessage,
        hint
    };
};
