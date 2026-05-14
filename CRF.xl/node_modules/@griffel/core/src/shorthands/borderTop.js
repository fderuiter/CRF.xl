import { isBorderStyle } from './utils.js';
/**
 * A function that implements expansion for "border-Top", it's simplified - check usage examples.
 *
 * @example
 *  borderTop('2px')
 *  borderTop('solid')
 *  borderTop('2px', 'solid')
 *  borderTop('solid', '2px')
 *  borderTop('2px', 'solid', 'red')
 *  borderTop('solid', '2px', 'red')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/border-top
 *
 * @deprecated Just use `{ borderTop: '2px solid red' }` instead as Griffel supports CSS shorthands now
 */
export function borderTop(...values) {
    if (isBorderStyle(values[0])) {
        return {
            borderTopStyle: values[0],
            ...(values[1] && { borderTopWidth: values[1] }),
            ...(values[2] && { borderTopColor: values[2] }),
        };
    }
    return {
        borderTopWidth: values[0],
        ...(values[1] && { borderTopStyle: values[1] }),
        ...(values[2] && { borderTopColor: values[2] }),
    };
}
//# sourceMappingURL=borderTop.js.map