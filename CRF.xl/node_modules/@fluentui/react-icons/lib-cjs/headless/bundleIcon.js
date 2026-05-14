"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleIcon = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const shared_1 = require("./shared");
/**
 * Headless bundleIcon — combines Filled and Regular icon variants.
 *
 * Renders both icons; the inactive variant gets `data-fui-icon-hidden`.
 * The shipped headless.css handles visibility via `[data-fui-icon-hidden] { display: none }`.
 */
const bundleIcon = (FilledIcon, RegularIcon) => {
    const Component = (props) => {
        const { className, filled, ...rest } = props;
        return (React.createElement(React.Fragment, null,
            React.createElement(FilledIcon, Object.assign({}, rest, { className: shared_1.cx(shared_1.iconFilledClassName, className) }, (!filled ? { [shared_1.DATA_FUI_ICON_HIDDEN]: '' } : undefined))),
            React.createElement(RegularIcon, Object.assign({}, rest, { className: shared_1.cx(shared_1.iconRegularClassName, className) }, (filled ? { [shared_1.DATA_FUI_ICON_HIDDEN]: '' } : undefined)))));
    };
    Component.displayName = 'CompoundIcon';
    return Component;
};
exports.bundleIcon = bundleIcon;
