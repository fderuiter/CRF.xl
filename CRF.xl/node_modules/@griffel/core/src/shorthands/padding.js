import { generateStyles } from './generateStyles.js';
/**
 * A function that implements CSS spec conformant expansion for "padding"
 *
 * @example
 *   padding('10px')
 *   padding('10px', '5px')
 *   padding('2px', '4px', '8px')
 *   padding('1px', 0, '3px', '4px')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/padding
 *
 * @deprecated Just use `{ padding: '10px 5px 8px 4px' }` instead as Griffel supports CSS shorthands now
 */
export function padding(...values) {
    return generateStyles('padding', '', ...values);
}
//# sourceMappingURL=padding.js.map