import type { MakeResetStylesOptions } from './makeResetStyles.js';
import type { CSSRulesByBucket, GriffelInsertionFactory } from './types.js';
/**
 * @private
 */
export declare function __resetStyles(ltrClassName: string, rtlClassName: string | null, cssRules: CSSRulesByBucket | string[], factory?: GriffelInsertionFactory): (options: MakeResetStylesOptions) => string;
