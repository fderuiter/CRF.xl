/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { getTabsterOnElement } from "./Instance.js";
import { TABSTER_ATTRIBUTE_NAME } from "./Consts.js";
import { createElementTreeWalker, getInstanceContext, WeakHTMLElement, } from "./Utils.js";
import { dom } from "./DOMAPI.js";
export function observeMutations(doc, tabster, updateTabsterByAttribute, syncState) {
    if (typeof MutationObserver === "undefined") {
        return () => {
            /* Noop */
        };
    }
    const getWindow = tabster.getWindow;
    let elementByUId;
    const onMutation = (mutations) => {
        const removedNodes = new Set();
        for (const mutation of mutations) {
            const target = mutation.target;
            const removed = mutation.removedNodes;
            const added = mutation.addedNodes;
            if (mutation.type === "attributes") {
                if (mutation.attributeName === TABSTER_ATTRIBUTE_NAME) {
                    // removedNodes helps to make sure we are not recreating things
                    // for the removed elements.
                    // For some reason, if we do removeChild() and setAttribute() on the
                    // removed child in the same tick, both the child removal and the attribute
                    // change will be present in the mutation records. And the attribute change
                    // will follow the child removal.
                    // So, we remember the removed nodes and ignore attribute changes for them.
                    if (!removedNodes.has(target)) {
                        updateTabsterByAttribute(tabster, target);
                    }
                }
            }
            else {
                for (let i = 0; i < removed.length; i++) {
                    const removedNode = removed[i];
                    removedNodes.add(removedNode);
                    updateTabsterElements(removedNode, true);
                    tabster._dummyObserver.domChanged?.(target);
                }
                for (let i = 0; i < added.length; i++) {
                    updateTabsterElements(added[i]);
                    tabster._dummyObserver.domChanged?.(target);
                }
            }
        }
        removedNodes.clear();
        tabster.modalizer?.hiddenUpdate();
    };
    function updateTabsterElements(node, removed) {
        if (!elementByUId) {
            elementByUId = getInstanceContext(getWindow).elementByUId;
        }
        processNode(node, removed);
        const walker = createElementTreeWalker(doc, node, (element) => {
            return processNode(element, removed);
        });
        if (walker) {
            while (walker.nextNode()) {
                /* Iterating for the sake of calling processNode() callback. */
            }
        }
    }
    function processNode(element, removed) {
        if (!element.getAttribute) {
            // It might actually be a text node.
            return NodeFilter.FILTER_SKIP;
        }
        const uid = element.__tabsterElementUID;
        if (uid && elementByUId) {
            if (removed) {
                delete elementByUId[uid];
            }
            else {
                elementByUId[uid] ??= new WeakHTMLElement(element);
            }
        }
        if (getTabsterOnElement(tabster, element) ||
            element.hasAttribute(TABSTER_ATTRIBUTE_NAME)) {
            updateTabsterByAttribute(tabster, element, removed);
        }
        return NodeFilter.FILTER_SKIP;
    }
    const observer = dom.createMutationObserver(onMutation);
    if (syncState) {
        updateTabsterElements(getWindow().document.body);
    }
    observer.observe(doc, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [TABSTER_ATTRIBUTE_NAME],
    });
    return () => {
        observer.disconnect();
    };
}
//# sourceMappingURL=MutationEvent.js.map