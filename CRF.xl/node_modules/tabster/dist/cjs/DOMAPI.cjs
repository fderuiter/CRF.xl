"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get dom () {
        return dom;
    },
    get setDOMAPI () {
        return setDOMAPI;
    }
});
/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ const _createMutationObserver = (callback)=>new MutationObserver(callback);
const _createTreeWalker = (doc, root, whatToShow, filter)=>doc.createTreeWalker(root, whatToShow, filter);
const _getParentNode = (node)=>node ? node.parentNode : null;
const _getParentElement = (element)=>element ? element.parentElement : null;
const _nodeContains = (parent, child)=>!!(child && parent?.contains(child));
const _getActiveElement = (doc)=>doc.activeElement;
const _querySelector = (element, selector)=>element.querySelector(selector);
const _querySelectorAll = (element, selector)=>Array.prototype.slice.call(element.querySelectorAll(selector), 0);
const _getElementById = (doc, id)=>doc.getElementById(id);
const _getFirstChild = (node)=>node?.firstChild || null;
const _getLastChild = (node)=>node?.lastChild || null;
const _getNextSibling = (node)=>node?.nextSibling || null;
const _getPreviousSibling = (node)=>node?.previousSibling || null;
const _getFirstElementChild = (element)=>element?.firstElementChild || null;
const _getLastElementChild = (element)=>element?.lastElementChild || null;
const _getNextElementSibling = (element)=>element?.nextElementSibling || null;
const _getPreviousElementSibling = (element)=>element?.previousElementSibling || null;
const _appendChild = (parent, child)=>parent.appendChild(child);
const _insertBefore = (parent, child, referenceChild)=>parent.insertBefore(child, referenceChild);
const _getSelection = (ref)=>ref.ownerDocument?.getSelection() || null;
const _getElementsByName = (referenceElement, name)=>referenceElement.ownerDocument.getElementsByName(name);
const dom = {
    createMutationObserver: _createMutationObserver,
    createTreeWalker: _createTreeWalker,
    getParentNode: _getParentNode,
    getParentElement: _getParentElement,
    nodeContains: _nodeContains,
    getActiveElement: _getActiveElement,
    querySelector: _querySelector,
    querySelectorAll: _querySelectorAll,
    getElementById: _getElementById,
    getFirstChild: _getFirstChild,
    getLastChild: _getLastChild,
    getNextSibling: _getNextSibling,
    getPreviousSibling: _getPreviousSibling,
    getFirstElementChild: _getFirstElementChild,
    getLastElementChild: _getLastElementChild,
    getNextElementSibling: _getNextElementSibling,
    getPreviousElementSibling: _getPreviousElementSibling,
    appendChild: _appendChild,
    insertBefore: _insertBefore,
    getSelection: _getSelection,
    getElementsByName: _getElementsByName
};
function setDOMAPI(domapi) {
    for (const key of Object.keys(domapi)){
        dom[key] = domapi[key];
    }
} //# sourceMappingURL=DOMAPI.js.map
