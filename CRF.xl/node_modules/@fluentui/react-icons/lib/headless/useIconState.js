import { useIconContext } from '../contexts';
import { DATA_FUI_ICON, DATA_FUI_ICON_RTL } from './shared';
/**
 * Headless version of useIconState
 *
 * Handles:
 * - a11y: aria-hidden, aria-label, role="img"
 * - RTL: sets data-fui-icon-rtl attribute when flipInRtl + RTL context
 * - Headless: sets data-fui-icon attribute for CSS targeting
 * - Fill: maps primaryFill to fill prop
 */
export const useIconState = (props, options) => {
    const { 
    // remove unwanted props to be set on the svg/html element
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    filled, title, primaryFill = 'currentColor', ...rest } = props;
    const state = {
        ...rest,
        fill: primaryFill,
    };
    const iconContext = useIconContext();
    const isRtlFlip = (options === null || options === void 0 ? void 0 : options.flipInRtl) && (iconContext === null || iconContext === void 0 ? void 0 : iconContext.textDirection) === 'rtl';
    // Data attributes for CSS targeting
    state[DATA_FUI_ICON] = '';
    if (isRtlFlip) {
        state[DATA_FUI_ICON_RTL] = '';
    }
    if (title) {
        state['aria-label'] = title;
    }
    if (!state['aria-label'] && !state['aria-labelledby']) {
        state['aria-hidden'] = true;
    }
    else {
        state['role'] = 'img';
    }
    return state;
};
