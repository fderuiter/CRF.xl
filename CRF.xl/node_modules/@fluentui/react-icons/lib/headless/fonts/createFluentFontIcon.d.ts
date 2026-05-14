import * as React from 'react';
import type { FluentIconsProps } from '../shared';
import { FontFile } from '../../utils/fonts/createFluentFontIcon.shared';
export declare type CreateFluentFontIconOptions = {
    flipInRtl?: boolean;
};
export declare type FluentFontIcon = React.FC<FluentIconsProps<React.HTMLAttributes<HTMLElement>, HTMLElement>> & {
    codepoint: string;
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
export declare function createFluentFontIcon(displayName: string, codepoint: string, font: FontFile, fontSize?: number, options?: CreateFluentFontIconOptions): FluentFontIcon;
