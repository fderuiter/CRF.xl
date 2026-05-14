"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "scopePlugin", {
    enumerable: true,
    get: function() {
        return scopePlugin;
    }
});
const _stylis = require("stylis");
const CONTAINER_TYPE = '@container';
function isHoistableAtRule(element) {
    return element.type === _stylis.MEDIA || element.type === _stylis.SUPPORTS || element.type === _stylis.LAYER || element.type === CONTAINER_TYPE;
}
/**
 * Swaps `@scope` and a conditional at-rule that was its child: clones `scope`
 * with the at-rule's children, makes the at-rule wrap the clone, and inherits
 * the scope's tree position (`root`/`parent`) — so `rulesheetPlugin` treats
 * the wrapper the same way it would have treated the original scope.
 */ function hoistOutOfScope(scope, atRule) {
    const scopeClone = {
        ...scope,
        children: atRule.children,
        return: '',
        root: atRule,
        parent: atRule
    };
    atRule.children = [
        scopeClone
    ];
    atRule.return = '';
    atRule.root = scope.root;
    atRule.parent = scope.parent;
    return atRule;
}
function stripPrefix(elements, rootSelector) {
    for (const element of elements){
        if (element.type === _stylis.RULESET && Array.isArray(element.props)) {
            element.props = element.props.map((value)=>{
                if (value.startsWith(rootSelector)) {
                    return value.slice(rootSelector.length + 1 /* +1 for space */ );
                }
                return value;
            });
        }
        if (Array.isArray(element.children)) {
            stripPrefix(element.children, rootSelector);
        }
    }
}
function scopePlugin(rootSelector) {
    const insertion = `(${rootSelector}) `;
    return (element, _index, siblings)=>{
        if (element.type !== _stylis.SCOPE || !Array.isArray(element.children)) {
            return;
        }
        // Clones inherit the modified prelude, so skip the rewrite when re-entered for a sibling we just produced.
        if (typeof element.value === 'string' && element.value.indexOf(insertion) === -1) {
            element.value = `${_stylis.SCOPE} ${insertion}${element.value.slice(_stylis.SCOPE.length + 1)}`;
            stripPrefix(element.children, rootSelector);
        }
        // Pull conditional at-rule children out and reuse each as a sibling wrapper around a clone of `@scope`.
        const inner = [];
        const hoisted = [];
        for (const child of element.children){
            if (isHoistableAtRule(child)) {
                hoisted.push(child);
                continue;
            }
            inner.push(child);
        }
        if (hoisted.length === 0) {
            return;
        }
        element.children = inner;
        for (const atRule of hoisted){
            siblings.push(hoistOutOfScope(element, atRule));
        }
    };
} //# sourceMappingURL=scopePlugin.js.map
