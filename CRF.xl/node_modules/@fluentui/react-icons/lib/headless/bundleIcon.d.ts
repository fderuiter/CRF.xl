import type { FluentIcon } from './shared';
/**
 * Headless bundleIcon — combines Filled and Regular icon variants.
 *
 * Renders both icons; the inactive variant gets `data-fui-icon-hidden`.
 * The shipped headless.css handles visibility via `[data-fui-icon-hidden] { display: none }`.
 */
export declare const bundleIcon: (FilledIcon: FluentIcon, RegularIcon: FluentIcon) => FluentIcon;
