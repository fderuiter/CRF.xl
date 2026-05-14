import { borderWidth } from './borderWidth.js';
import { borderStyle } from './borderStyle.js';
import { borderColor } from './borderColor.js';
import { isBorderStyle } from './utils.js';
/**
 * A function that implements expansion for "border" to all sides of an element, it's simplified - check usage examples.
 *
 * @example
 *  border('2px')
 *  border('solid')
 *  border('2px', 'solid')
 *  border('solid', '2px')
 *  border('2px', 'solid', 'red')
 *  border('solid', '2px', 'red')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/border
 *
 * @deprecated Just use `{ border: '2px solid red' }` instead as Griffel supports CSS shorthands now
 */
export function border(...values) {
    if (isBorderStyle(values[0])) {
        return {
            ...borderStyle(values[0]),
            ...(values[1] && borderWidth(values[1])),
            ...(values[2] && borderColor(values[2])),
        };
    }
    return {
        ...borderWidth(values[0]),
        ...(values[1] && borderStyle(values[1])),
        ...(values[2] && borderColor(values[2])),
    };
}
//# sourceMappingURL=border.js.map