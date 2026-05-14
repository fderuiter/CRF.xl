/**
 * A function that implements expansion for "textDecoration" to all sides of an element, it's simplified - check usage examples.
 *
 * @example
 *  textDecoration('none')
 *  textDecoration('dotted')
 *  textDecoration('underline', 'dotted')
 *  textDecoration('underline', 'dotted', 'red')
 *  textDecoration('underline', 'dotted', 'red', '2px')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration
 *
 * @deprecated Just use `{ textDecoration: 'underline dotted red 2px' }` instead as Griffel supports CSS shorthands now
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "textDecoration", {
    enumerable: true,
    get: function() {
        return textDecoration;
    }
});
function textDecoration(value, ...values) {
    if (values.length === 0) {
        return isTextDecorationStyleInput(value) ? {
            textDecorationStyle: value
        } : {
            textDecorationLine: value
        };
    }
    const [textDecorationStyle, textDecorationColor, textDecorationThickness] = values;
    return {
        textDecorationLine: value,
        ...textDecorationStyle && {
            textDecorationStyle
        },
        ...textDecorationColor && {
            textDecorationColor
        },
        ...textDecorationThickness && {
            textDecorationThickness
        }
    };
}
const textDecorationStyleInputs = [
    'dashed',
    'dotted',
    'double',
    'solid',
    'wavy'
];
function isTextDecorationStyleInput(value) {
    return textDecorationStyleInputs.includes(value);
} //# sourceMappingURL=textDecoration.js.map
