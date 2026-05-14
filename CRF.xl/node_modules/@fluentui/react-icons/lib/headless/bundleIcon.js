import * as React from 'react';
import { cx, iconFilledClassName, iconRegularClassName, DATA_FUI_ICON_HIDDEN } from './shared';
/**
 * Headless bundleIcon — combines Filled and Regular icon variants.
 *
 * Renders both icons; the inactive variant gets `data-fui-icon-hidden`.
 * The shipped headless.css handles visibility via `[data-fui-icon-hidden] { display: none }`.
 */
export const bundleIcon = (FilledIcon, RegularIcon) => {
    const Component = (props) => {
        const { className, filled, ...rest } = props;
        return (React.createElement(React.Fragment, null,
            React.createElement(FilledIcon, Object.assign({}, rest, { className: cx(iconFilledClassName, className) }, (!filled ? { [DATA_FUI_ICON_HIDDEN]: '' } : undefined))),
            React.createElement(RegularIcon, Object.assign({}, rest, { className: cx(iconRegularClassName, className) }, (filled ? { [DATA_FUI_ICON_HIDDEN]: '' } : undefined)))));
    };
    Component.displayName = 'CompoundIcon';
    return Component;
};
