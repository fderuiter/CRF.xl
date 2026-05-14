import type { GriffelStaticStyles } from '@griffel/style-types';
import type { GriffelRenderer } from './types.js';
import type { GriffelInsertionFactory } from './types.js';
export interface MakeStaticStylesOptions {
    renderer: GriffelRenderer;
}
export declare function makeStaticStyles(styles: GriffelStaticStyles | GriffelStaticStyles[], factory?: GriffelInsertionFactory): (options: MakeStaticStylesOptions) => void;
