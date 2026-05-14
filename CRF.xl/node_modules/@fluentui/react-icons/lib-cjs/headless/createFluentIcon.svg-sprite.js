"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFluentIcon = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const shared_1 = require("./shared");
const useIconState_1 = require("./useIconState");
/**
 * Headless createFluentIcon for sprite-based icons.
 *
 * @access private
 * @alpha
 */
const createFluentIcon = (iconId, size, spritePath, options) => {
    const viewBoxWidth = size === '1em' ? '20' : size;
    const Icon = React.forwardRef((props, ref) => {
        const iconState = useIconState_1.useIconState(props, { flipInRtl: options === null || options === void 0 ? void 0 : options.flipInRtl });
        const state = {
            ...iconState,
            className: shared_1.cx(shared_1.iconClassName, iconState.className),
            ref,
            width: size,
            height: size,
            viewBox: `0 0 ${viewBoxWidth} ${viewBoxWidth}`,
            xmlns: 'http://www.w3.org/2000/svg',
        };
        const href = spritePath ? `${spritePath}#${iconId}` : `#${iconId}`;
        return React.createElement('svg', state, React.createElement('use', { href }));
    });
    Icon.displayName = iconId;
    return Icon;
};
exports.createFluentIcon = createFluentIcon;
