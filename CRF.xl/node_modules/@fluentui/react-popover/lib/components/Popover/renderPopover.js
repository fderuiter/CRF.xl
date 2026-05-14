  import { jsx as _jsx, jsxs as _jsxs } from "@fluentui/react-jsx-runtime/jsx-runtime";
import * as React from 'react';
import { assertSlots } from '@fluentui/react-utilities';
import { MotionRefForwarder } from '@fluentui/react-motion';
import { PopoverContext, popoverContextDefaultValue } from '../../popoverContext';
/**
 * Render the final JSX of Popover
 */ export const renderPopover_unstable = (state, contextValues)=>{
    assertSlots(state);
    var _contextValues_popover;
    return /*#__PURE__*/ _jsxs(PopoverContext.Provider, {
        value: (_contextValues_popover = contextValues === null || contextValues === void 0 ? void 0 : contextValues.popover) !== null && _contextValues_popover !== void 0 ? _contextValues_popover : popoverContextDefaultValue,
        children: [
            state.popoverTrigger,
            state.popoverSurface && /*#__PURE__*/ _jsx(state.surfaceMotion, {
                children: /*#__PURE__*/ _jsx(MotionRefForwarder, {
                    children: state.popoverSurface
                })
            })
        ]
    });
};
