/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
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
    get appendChild () {
        return appendChild;
    },
    get getActiveElement () {
        return getActiveElement;
    },
    get getElementsByName () {
        return getElementsByName;
    },
    get getFirstChild () {
        return getFirstChild;
    },
    get getFirstElementChild () {
        return getFirstElementChild;
    },
    get getLastChild () {
        return getLastChild;
    },
    get getLastElementChild () {
        return getLastElementChild;
    },
    get getNextElementSibling () {
        return getNextElementSibling;
    },
    get getNextSibling () {
        return getNextSibling;
    },
    get getParentElement () {
        return getParentElement;
    },
    get getParentNode () {
        return getParentNode;
    },
    get getPreviousElementSibling () {
        return getPreviousElementSibling;
    },
    get getPreviousSibling () {
        return getPreviousSibling;
    },
    get getSelection () {
        return getSelection;
    },
    get insertBefore () {
        return insertBefore;
    },
    get nodeContains () {
        return nodeContains;
    }
});
function getActiveElement(doc) {
    let activeElement = doc.activeElement;
    while(activeElement?.shadowRoot?.activeElement){
        activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
}
function nodeContains(node, otherNode) {
    if (!node || !otherNode) {
        return false;
    }
    let currentNode = otherNode;
    while(currentNode){
        if (currentNode === node) {
            return true;
        }
        if (typeof currentNode.assignedElements !== "function" && currentNode.assignedSlot?.parentNode) {
            // Element is slotted
            currentNode = currentNode.assignedSlot?.parentNode;
        } else if (currentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
            // Element is in shadow root
            currentNode = currentNode.host;
        } else {
            currentNode = currentNode.parentNode;
        }
    }
    return false;
}
function getParentNode(node) {
    if (!node) {
        return null;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && node.host) {
        return node.host;
    }
    return node.parentNode;
}
function getParentElement(element) {
    for(let parentNode = getParentNode(element); parentNode; parentNode = getParentNode(parentNode)){
        if (parentNode.nodeType === Node.ELEMENT_NODE) {
            return parentNode;
        }
    }
    return null;
}
function getFirstChild(node) {
    if (!node) {
        return null;
    }
    if (node.shadowRoot) {
        const child = getFirstChild(node.shadowRoot);
        if (child) {
            return child;
        }
    // If the attached shadowRoot has no children, just try ordinary children,
    // that might come after.
    }
    return node.firstChild;
}
function getLastChild(node) {
    if (!node) {
        return null;
    }
    if (!node.lastChild && node.shadowRoot) {
        return getLastChild(node.shadowRoot);
    }
    return node.lastChild;
}
function getNextSibling(node) {
    return node?.nextSibling || null;
}
function getPreviousSibling(node) {
    if (!node) {
        return null;
    }
    let sibling = node.previousSibling;
    if (!sibling && node.parentElement?.shadowRoot) {
        sibling = getLastChild(node.parentElement.shadowRoot);
    }
    return sibling;
}
function getFirstElementChild(element) {
    let child = getFirstChild(element);
    while(child && child.nodeType !== Node.ELEMENT_NODE){
        child = getNextSibling(child);
    }
    return child;
}
function getLastElementChild(element) {
    let child = getLastChild(element);
    while(child && child.nodeType !== Node.ELEMENT_NODE){
        child = getPreviousSibling(child);
    }
    return child;
}
function getNextElementSibling(element) {
    let sibling = getNextSibling(element);
    while(sibling && sibling.nodeType !== Node.ELEMENT_NODE){
        sibling = getNextSibling(sibling);
    }
    return sibling;
}
function getPreviousElementSibling(element) {
    let sibling = getPreviousSibling(element);
    while(sibling && sibling.nodeType !== Node.ELEMENT_NODE){
        sibling = getPreviousSibling(sibling);
    }
    return sibling;
}
function appendChild(parent, child) {
    const shadowRoot = parent.shadowRoot;
    return shadowRoot ? shadowRoot.appendChild(child) : parent.appendChild(child);
}
function insertBefore(parent, child, referenceChild) {
    const shadowRoot = parent.shadowRoot;
    return shadowRoot ? shadowRoot.insertBefore(child, referenceChild) : parent.insertBefore(child, referenceChild);
}
function getSelection(ref) {
    const win = ref.ownerDocument?.defaultView;
    if (!win) {
        return null;
    }
    for(let el = ref; el; el = el.parentNode){
        if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            const tmp = el;
            // ShadowRoot.getSelection() exists only in Chrome.
            if (tmp.getSelection) {
                return tmp.getSelection() || null;
            }
            break;
        }
    }
    return win.getSelection() || null;
}
function getElementsByName(referenceElement, name) {
    for(let el = referenceElement; el; el = el.parentNode){
        if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // Shadow root doesn't have getElementsByName()...
            return el.querySelectorAll(`[name=${name}]`);
        }
    }
    return referenceElement.ownerDocument.getElementsByName(name);
} //# sourceMappingURL=DOMFunctions.js.map
