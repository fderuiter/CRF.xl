import * as React from 'react';
import { fontIconClassName, DATA_FUI_ICON, DATA_FUI_ICON_FONT, cx } from '../shared';
import { useIconState } from '../useIconState';
const FONT_VARIANT_MAP = {
    [0 /* Filled */]: 'filled',
    [1 /* Regular */]: 'regular',
    [2 /* Resizable */]: 'resizable',
    [3 /* Light */]: 'light',
};
/**
 * Headless createFluentFontIcon — font icon factory without Griffel.
 *
 * Sets data attributes for CSS targeting:
 * - data-fui-icon="font" for base font icon styles
 * - data-fui-icon-font="filled|regular|..." for font-family selection
 *
 * @access private
 * @alpha
 */
export function createFluentFontIcon(displayName, codepoint, font, fontSize, options) {
    const Component = (props) => {
        const className = cx(fontIconClassName, props.className);
        const state = useIconState({ ...props, className }, { flipInRtl: options === null || options === void 0 ? void 0 : options.flipInRtl });
        // Override the default data-fui-icon to "font" for font-specific styles
        state[DATA_FUI_ICON] = 'font';
        state[DATA_FUI_ICON_FONT] = FONT_VARIANT_MAP[font];
        // Map primaryFill to color for font icons
        if (props.primaryFill && props.primaryFill.toLowerCase() !== 'currentcolor') {
            state.style = {
                ...state.style,
                color: props.primaryFill,
            };
        }
        if (fontSize) {
            state.style = {
                ...state.style,
                fontSize,
            };
        }
        return React.createElement("i", Object.assign({}, state), codepoint);
    };
    Component.displayName = displayName;
    Component.codepoint = codepoint;
    return Component;
}
