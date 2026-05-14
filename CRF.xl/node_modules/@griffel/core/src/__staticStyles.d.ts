import type { CSSRulesByBucket, GriffelInsertionFactory } from './types.js';
import type { MakeStaticStylesOptions } from './makeStaticStyles.js';
/**
 * A version of makeStaticStyles() that accepts build output as an input and skips all runtime transforms.
 *
 * @private
 */
export declare function __staticStyles(cssRules: CSSRulesByBucket, factory?: GriffelInsertionFactory): (options: MakeStaticStylesOptions) => void;
