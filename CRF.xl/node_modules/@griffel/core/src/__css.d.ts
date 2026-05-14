import type { MakeStylesOptions } from './makeStyles.js';
import type { CSSClassesMapBySlot } from './types.js';
/**
 * A version of makeStyles() that accepts build output as an input and skips all runtime transforms & DOM insertion.
 *
 * @private
 */
export declare function __css<Slots extends string>(classesMapBySlot: CSSClassesMapBySlot<Slots>): (options: Pick<MakeStylesOptions, "dir">) => Record<Slots, string>;
