import { generateStyles } from './generateStyles.js';
/**
 * A function that implements CSS spec conformant expansion for "borderStyle"
 *
 * @example
 *  borderStyle('solid')
 *  borderStyle('solid', 'dashed')
 *  borderStyle('solid', 'dashed', 'dotted')
 *  borderStyle('solid', 'dashed', 'dotted', 'double')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/border-style
 */
export function borderStyle(...values) {
    return generateStyles('border', 'Style', ...values);
}
//# sourceMappingURL=borderStyle.js.map