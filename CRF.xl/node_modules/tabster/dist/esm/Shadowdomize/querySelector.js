/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function shadowQuerySelector(node, selector, all) {
    // TODO: This is probably slow. Optimize to use each shadowRoot's querySelector/querySelectorAll
    //       instead of walking the tree.
    const elements = [];
    walk(node, selector);
    return elements;
    function walk(from, selector) {
        let el = null;
        const walker = document.createTreeWalker(from, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (n) => {
                if (n.nodeType === Node.ELEMENT_NODE) {
                    if (n.matches(selector)) {
                        el = n;
                        elements.push(el);
                        return all
                            ? NodeFilter.FILTER_SKIP
                            : NodeFilter.FILTER_ACCEPT;
                    }
                    const shadowRoot = n.shadowRoot;
                    if (shadowRoot) {
                        walk(shadowRoot, selector);
                        return !all && elements.length
                            ? NodeFilter.FILTER_ACCEPT
                            : NodeFilter.FILTER_SKIP;
                    }
                }
                return NodeFilter.FILTER_SKIP;
            },
        });
        walker.nextNode();
    }
}
export function querySelectorAll(node, selector) {
    return shadowQuerySelector(node, selector, true);
}
export function querySelector(node, selector) {
    return shadowQuerySelector(node, selector, false)[0] || null;
}
export function getElementById(doc, id) {
    return querySelector(doc, "#" + id);
}
//# sourceMappingURL=querySelector.js.map