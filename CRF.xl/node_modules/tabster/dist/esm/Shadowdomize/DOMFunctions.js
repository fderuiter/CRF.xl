/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
export function getActiveElement(doc) {
    let activeElement = doc.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
        activeElement = activeElement.shadowRoot.activeElement;
    }
    return activeElement;
}
export function nodeContains(node, otherNode) {
    if (!node || !otherNode) {
        return false;
    }
    let currentNode = otherNode;
    while (currentNode) {
        if (currentNode === node) {
            return true;
        }
        if (typeof currentNode.assignedElements !==
            "function" &&
            currentNode.assignedSlot?.parentNode) {
            // Element is slotted
            currentNode = currentNode.assignedSlot?.parentNode;
        }
        else if (currentNode.nodeType === document.DOCUMENT_FRAGMENT_NODE) {
            // Element is in shadow root
            currentNode = currentNode.host;
        }
        else {
            currentNode = currentNode.parentNode;
        }
    }
    return false;
}
export function getParentNode(node) {
    if (!node) {
        return null;
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
        node.host) {
        return node.host;
    }
    return node.parentNode;
}
export function getParentElement(element) {
    for (let parentNode = getParentNode(element); parentNode; parentNode = getParentNode(parentNode)) {
        if (parentNode.nodeType === Node.ELEMENT_NODE) {
            return parentNode;
        }
    }
    return null;
}
export function getFirstChild(node) {
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
export function getLastChild(node) {
    if (!node) {
        return null;
    }
    if (!node.lastChild && node.shadowRoot) {
        return getLastChild(node.shadowRoot);
    }
    return node.lastChild;
}
export function getNextSibling(node) {
    return node?.nextSibling || null;
}
export function getPreviousSibling(node) {
    if (!node) {
        return null;
    }
    let sibling = node.previousSibling;
    if (!sibling && node.parentElement?.shadowRoot) {
        sibling = getLastChild(node.parentElement.shadowRoot);
    }
    return sibling;
}
export function getFirstElementChild(element) {
    let child = getFirstChild(element);
    while (child && child.nodeType !== Node.ELEMENT_NODE) {
        child = getNextSibling(child);
    }
    return child;
}
export function getLastElementChild(element) {
    let child = getLastChild(element);
    while (child && child.nodeType !== Node.ELEMENT_NODE) {
        child = getPreviousSibling(child);
    }
    return child;
}
export function getNextElementSibling(element) {
    let sibling = getNextSibling(element);
    while (sibling && sibling.nodeType !== Node.ELEMENT_NODE) {
        sibling = getNextSibling(sibling);
    }
    return sibling;
}
export function getPreviousElementSibling(element) {
    let sibling = getPreviousSibling(element);
    while (sibling && sibling.nodeType !== Node.ELEMENT_NODE) {
        sibling = getPreviousSibling(sibling);
    }
    return sibling;
}
export function appendChild(parent, child) {
    const shadowRoot = parent.shadowRoot;
    return shadowRoot
        ? shadowRoot.appendChild(child)
        : parent.appendChild(child);
}
export function insertBefore(parent, child, referenceChild) {
    const shadowRoot = parent.shadowRoot;
    return shadowRoot
        ? shadowRoot.insertBefore(child, referenceChild)
        : parent.insertBefore(child, referenceChild);
}
export function getSelection(ref) {
    const win = ref.ownerDocument?.defaultView;
    if (!win) {
        return null;
    }
    for (let el = ref; el; el = el.parentNode) {
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
export function getElementsByName(referenceElement, name) {
    for (let el = referenceElement; el; el = el.parentNode) {
        if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // Shadow root doesn't have getElementsByName()...
            return el.querySelectorAll(`[name=${name}]`);
        }
    }
    return referenceElement.ownerDocument.getElementsByName(name);
}
//# sourceMappingURL=DOMFunctions.js.map