/**
 * The same plugin as in stylis, but this version also has "element" argument.
 */
export function rulesheetPlugin(callback) {
    return function (element) {
        if (!element.root) {
            if (element.return) {
                callback(element, element.return);
            }
        }
    };
}
//# sourceMappingURL=rulesheetPlugin.js.map