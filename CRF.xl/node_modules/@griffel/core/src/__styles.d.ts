import type { CSSClassesMapBySlot, CSSRulesByBucket, GriffelInsertionFactory } from './types.js';
import type { MakeStylesOptions } from './makeStyles.js';
/**
 * A version of makeStyles() that accepts build output as an input and skips all runtime transforms.
 *
 * @private
 */
export declare function __styles<Slots extends string>(classesMapBySlot: CSSClassesMapBySlot<Slots>, cssRules: CSSRulesByBucket, factory?: GriffelInsertionFactory): (options: Pick<MakeStylesOptions, "dir" | "renderer">) => Record<Slots, string>;
