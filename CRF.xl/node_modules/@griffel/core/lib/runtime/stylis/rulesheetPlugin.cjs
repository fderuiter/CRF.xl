/**
 * The same plugin as in stylis, but this version also has "element" argument.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "rulesheetPlugin", {
    enumerable: true,
    get: function() {
        return rulesheetPlugin;
    }
});
function rulesheetPlugin(callback) {
    return function(element) {
        if (!element.root) {
            if (element.return) {
                callback(element, element.return);
            }
        }
    };
} //# sourceMappingURL=rulesheetPlugin.js.map
