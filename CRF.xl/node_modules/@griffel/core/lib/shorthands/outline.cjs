/**
 * A function that implements expansion for "outline", it's simplified - check usage examples.
 *
 * @example
 *  outline('2px')
 *  outline('2px', 'solid')
 *  outline('2px', 'solid', 'red')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/outline
 *
 * @deprecated Just use `{ outline: '2px solid red' }` instead as Griffel supports CSS shorthands now
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "outline", {
    enumerable: true,
    get: function() {
        return outline;
    }
});
function outline(outlineWidth, outlineStyle, outlineColor) {
    return {
        outlineWidth,
        ...outlineStyle && {
            outlineStyle
        },
        ...outlineColor && {
            outlineColor
        }
    };
} //# sourceMappingURL=outline.js.map
