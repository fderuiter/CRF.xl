/** Base data attribute applied to all icons (SVG and font). */
export declare const DATA_FUI_ICON = "data-fui-icon";
/** Data attribute applied to icons that should flip in RTL text direction. */
export declare const DATA_FUI_ICON_RTL = "data-fui-icon-rtl";
/** Data attribute applied to the inactive variant in a bundled icon pair. */
export declare const DATA_FUI_ICON_HIDDEN = "data-fui-icon-hidden";
/** Data attribute for font icon font-family variant selection (filled|regular|resizable|light). */
export declare const DATA_FUI_ICON_FONT = "data-fui-icon-font";
export { iconClassName, iconFilledClassName, iconRegularClassName, iconLightClassName, iconColorClassName, fontIconClassName, } from '../utils/constants';
export type { FluentIconsProps } from '../utils/FluentIconsProps.types';
export type { FluentIcon, CreateFluentIconOptions } from './createFluentIcon';
/**
 * Joins class name strings, filtering out falsy values.
 */
export declare function cx(...classes: (string | false | undefined | null)[]): string | undefined;
