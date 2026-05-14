/**
 * Trims selectors to generate consistent hashes.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "trimSelector", {
    enumerable: true,
    get: function() {
        return trimSelector;
    }
});
function trimSelector(selector) {
    return selector.replace(/>\s+/g, '>');
} //# sourceMappingURL=trimSelector.js.map
