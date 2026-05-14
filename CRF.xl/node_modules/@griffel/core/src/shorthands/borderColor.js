import { generateStyles } from './generateStyles.js';
/**
 * A function that implements CSS spec conformant expansion for "borderColor"
 *
 * @example
 *  borderColor('red')
 *  borderColor('red', 'blue')
 *  borderColor('red', 'blue', 'green')
 *  borderColor('red', 'blue', 'green', 'yellow')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/border-color
 */
export function borderColor(...values) {
    return generateStyles('border', 'Color', ...values);
}
//# sourceMappingURL=borderColor.js.map