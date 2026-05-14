import * as React from 'react';
import type { FluentIconsProps } from './shared';
export declare type UseIconStateOptions = {
    flipInRtl?: boolean;
};
/**
 * Headless version of useIconState
 *
 * Handles:
 * - a11y: aria-hidden, aria-label, role="img"
 * - RTL: sets data-fui-icon-rtl attribute when flipInRtl + RTL context
 * - Headless: sets data-fui-icon attribute for CSS targeting
 * - Fill: maps primaryFill to fill prop
 */
export declare const useIconState: <TBaseAttributes extends React.HTMLAttributes<HTMLElement> | React.SVGAttributes<SVGElement> = React.SVGAttributes<SVGElement>, TRefType extends HTMLElement | SVGSVGElement = SVGSVGElement>(props: FluentIconsProps<TBaseAttributes, TRefType>, options?: UseIconStateOptions | undefined) => Pick<FluentIconsProps<TBaseAttributes, TRefType>, "title" | "filled" | "ref" | "key" | "className" | Exclude<keyof TBaseAttributes, "primaryFill">>;
