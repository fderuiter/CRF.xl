/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { getLastElementChild, nodeContains } from "./DOMFunctions.js";
function getLastChild(container) {
    let lastChild = null;
    for (let i = getLastElementChild(container); i; i = getLastElementChild(i)) {
        lastChild = i;
    }
    return lastChild || undefined;
}
export class ShadowTreeWalker {
    filter;
    root;
    whatToShow;
    _doc;
    _walkerStack = [];
    _currentNode;
    _currentSetFor = new Set();
    constructor(doc, root, whatToShow, filter) {
        this._doc = doc;
        this.root = root;
        this.filter = filter ?? null;
        this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
        this._currentNode = root;
        this._walkerStack.unshift(doc.createTreeWalker(root, whatToShow, this._acceptNode));
        const shadowRoot = root.shadowRoot;
        if (shadowRoot) {
            const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, { acceptNode: this._acceptNode });
            this._walkerStack.unshift(walker);
        }
    }
    _acceptNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const shadowRoot = node.shadowRoot;
            if (shadowRoot) {
                const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, { acceptNode: this._acceptNode });
                this._walkerStack.unshift(walker);
                return NodeFilter.FILTER_ACCEPT;
            }
            else {
                if (typeof this.filter === "function") {
                    return this.filter(node);
                }
                else if (this.filter?.acceptNode) {
                    return this.filter.acceptNode(node);
                }
                else if (this.filter === null) {
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        }
        return NodeFilter.FILTER_SKIP;
    };
    get currentNode() {
        return this._currentNode;
    }
    set currentNode(node) {
        if (!nodeContains(this.root, node)) {
            throw new Error("Cannot set currentNode to a node that is not contained by the root node.");
        }
        const walkers = [];
        let curNode = node;
        let currentWalkerCurrentNode = node;
        this._currentNode = node;
        while (curNode && curNode !== this.root) {
            if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                const shadowRoot = curNode;
                const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, { acceptNode: this._acceptNode });
                walkers.push(walker);
                walker.currentNode = currentWalkerCurrentNode;
                this._currentSetFor.add(walker);
                curNode = currentWalkerCurrentNode = shadowRoot.host;
            }
            else {
                curNode = curNode.parentNode;
            }
        }
        const walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
            acceptNode: this._acceptNode,
        });
        walkers.push(walker);
        walker.currentNode = currentWalkerCurrentNode;
        this._currentSetFor.add(walker);
        this._walkerStack = walkers;
    }
    firstChild() {
        if ((process.env.NODE_ENV === 'development')) {
            throw new Error("Method not implemented.");
        }
        return null;
    }
    lastChild() {
        if ((process.env.NODE_ENV === 'development')) {
            throw new Error("Method not implemented.");
        }
        return null;
    }
    nextNode() {
        const nextNode = this._walkerStack[0].nextNode();
        if (nextNode) {
            const shadowRoot = nextNode.shadowRoot;
            if (shadowRoot) {
                let nodeResult;
                if (typeof this.filter === "function") {
                    nodeResult = this.filter(nextNode);
                }
                else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(nextNode);
                }
                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return nextNode;
                }
                // _acceptNode should have added new walker for this shadow,
                // go in recursively.
                return this.nextNode();
            }
            return nextNode;
        }
        else {
            if (this._walkerStack.length > 1) {
                this._walkerStack.shift();
                return this.nextNode();
            }
            else {
                return null;
            }
        }
    }
    previousNode() {
        const currentWalker = this._walkerStack[0];
        if (currentWalker.currentNode === currentWalker.root) {
            if (this._currentSetFor.has(currentWalker)) {
                this._currentSetFor.delete(currentWalker);
                if (this._walkerStack.length > 1) {
                    this._walkerStack.shift();
                    return this.previousNode();
                }
                else {
                    return null;
                }
            }
            const lastChild = getLastChild(currentWalker.root);
            if (lastChild) {
                currentWalker.currentNode = lastChild;
                let nodeResult;
                if (typeof this.filter === "function") {
                    nodeResult = this.filter(lastChild);
                }
                else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(lastChild);
                }
                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return lastChild;
                }
            }
        }
        const previousNode = currentWalker.previousNode();
        if (previousNode) {
            const shadowRoot = previousNode.shadowRoot;
            if (shadowRoot) {
                let nodeResult;
                if (typeof this.filter === "function") {
                    nodeResult = this.filter(previousNode);
                }
                else if (this.filter?.acceptNode) {
                    nodeResult = this.filter.acceptNode(previousNode);
                }
                if (nodeResult === NodeFilter.FILTER_ACCEPT) {
                    return previousNode;
                }
                // _acceptNode should have added new walker for this shadow,
                // go in recursively.
                return this.previousNode();
            }
            return previousNode;
        }
        else {
            if (this._walkerStack.length > 1) {
                this._walkerStack.shift();
                return this.previousNode();
            }
            else {
                return null;
            }
        }
    }
    nextSibling() {
        if ((process.env.NODE_ENV === 'development')) {
            throw new Error("Method not implemented.");
        }
        return null;
    }
    previousSibling() {
        if ((process.env.NODE_ENV === 'development')) {
            throw new Error("Method not implemented.");
        }
        return null;
    }
    parentNode() {
        if ((process.env.NODE_ENV === 'development')) {
            throw new Error("Method not implemented.");
        }
        return null;
    }
}
export function createShadowTreeWalker(doc, root, whatToShow, filter) {
    return new ShadowTreeWalker(doc, root, whatToShow, filter);
}
//# sourceMappingURL=ShadowTreeWalker.js.map