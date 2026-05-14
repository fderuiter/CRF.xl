/**
 * A function that implements CSS spec conformant expansion for "margin-block"
 *
 * @example
 *   marginBlock('10px')
 *   marginBlock('10px', '5px')
 *
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/margin-block
 *
 * @deprecated Just use `{ marginBlock: '10px' }` instead as Griffel supports CSS shorthands now
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "marginBlock", {
    enumerable: true,
    get: function() {
        return marginBlock;
    }
});
function marginBlock(start, end = start) {
    return {
        marginBlockStart: start,
        marginBlockEnd: end
    };
} //# sourceMappingURL=marginBlock.js.map
