import type { GriffelResetStyle } from '@griffel/style-types';
import type { CSSRulesByBucket } from '../types.js';
/**
 * @internal
 */
export declare function resolveResetStyleRules(styles: GriffelResetStyle, classNameHashSalt?: string): [string, string | null, CSSRulesByBucket | string[]];
