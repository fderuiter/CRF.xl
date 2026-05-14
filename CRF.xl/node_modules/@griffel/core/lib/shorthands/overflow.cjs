/**
 * A function that implements CSS spec conformant expansion for "overflow"
 *
 * @example
 *   overflow('hidden')
 *   overflow('hidden', 'scroll')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/overflow
 *
 * @deprecated Just use `{ overflow: 'hidden scroll' }` instead as Griffel supports CSS shorthands now
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "overflow", {
    enumerable: true,
    get: function() {
        return overflow;
    }
});
function overflow(overflowX, overflowY = overflowX) {
    return {
        overflowX,
        overflowY
    };
} //# sourceMappingURL=overflow.js.map
