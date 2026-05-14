/**
 * Default implementation of insertion factory. Inserts styles only once per renderer and performs
 * insertion immediately after styles computation.
 *
 * @internal
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "insertionFactory", {
    enumerable: true,
    get: function() {
        return insertionFactory;
    }
});
const insertionFactory = ()=>{
    const insertionCache = {};
    return function insertStyles(renderer, cssRules) {
        if (insertionCache[renderer.id] === undefined) {
            renderer.insertCSSRules(cssRules);
            insertionCache[renderer.id] = true;
        }
    };
}; //# sourceMappingURL=insertionFactory.js.map
