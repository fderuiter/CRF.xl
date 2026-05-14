/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { FOCUSABLE_SELECTOR, TABSTER_ATTRIBUTE_NAME, Visibilities, } from "./Consts.js";
import { dom } from "./DOMAPI.js";
let _uidCounter = 0;
export function getInstanceContext(getWindow) {
    const win = getWindow();
    let ctx = win.__tabsterInstanceContext;
    if (!ctx) {
        ctx = {
            elementByUId: {},
            containerBoundingRectCache: {},
            lastContainerBoundingRectCacheId: 0,
        };
        win.__tabsterInstanceContext = ctx;
    }
    return ctx;
}
export function disposeInstanceContext(win) {
    const ctx = win.__tabsterInstanceContext;
    if (ctx) {
        ctx.elementByUId = {};
        ctx.containerBoundingRectCache = {};
        if (ctx.containerBoundingRectCacheTimer) {
            win.clearTimeout(ctx.containerBoundingRectCacheTimer);
        }
        delete win.__tabsterInstanceContext;
    }
}
export function hasSubFocusable(element) {
    return !!element.querySelector(FOCUSABLE_SELECTOR);
}
export class WeakHTMLElement {
    _ref;
    _data;
    constructor(element, data) {
        this._ref = new WeakRef(element);
        this._data = data;
    }
    get() {
        const ref = this._ref;
        let element;
        if (ref) {
            element = ref.deref();
            if (!element) {
                delete this._ref;
            }
        }
        return element;
    }
    getData() {
        return this._data;
    }
}
export function createElementTreeWalker(doc, root, acceptNode) {
    if (root.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
    }
    return dom.createTreeWalker(doc, root, NodeFilter.SHOW_ELEMENT, {
        acceptNode,
    });
}
export function getBoundingRect(getWindow, element) {
    let cacheId = element.__tabsterCacheId;
    const context = getInstanceContext(getWindow);
    const cached = cacheId
        ? context.containerBoundingRectCache[cacheId]
        : undefined;
    if (cached) {
        return cached.rect;
    }
    const scrollingElement = element.ownerDocument && element.ownerDocument.documentElement;
    if (!scrollingElement) {
        return new DOMRect();
    }
    // A bounding rect of the top-level element contains the whole page regardless of the
    // scrollbar. So, we improvise a little and limiting the final result...
    let left = 0;
    let top = 0;
    let right = scrollingElement.clientWidth;
    let bottom = scrollingElement.clientHeight;
    if (element !== scrollingElement) {
        const r = element.getBoundingClientRect();
        left = Math.max(left, r.left);
        top = Math.max(top, r.top);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
    }
    const rect = new DOMRect(left < right ? left : -1, top < bottom ? top : -1, left < right ? right - left : 0, top < bottom ? bottom - top : 0);
    if (!cacheId) {
        cacheId = "r-" + ++context.lastContainerBoundingRectCacheId;
        element.__tabsterCacheId = cacheId;
    }
    context.containerBoundingRectCache[cacheId] = {
        rect,
        element,
    };
    if (!context.containerBoundingRectCacheTimer) {
        context.containerBoundingRectCacheTimer = window.setTimeout(() => {
            context.containerBoundingRectCacheTimer = undefined;
            for (const cId of Object.keys(context.containerBoundingRectCache)) {
                delete context.containerBoundingRectCache[cId].element
                    .__tabsterCacheId;
            }
            context.containerBoundingRectCache = {};
        }, 50);
    }
    return rect;
}
export function isElementVerticallyVisibleInContainer(getWindow, element, tolerance) {
    const container = getScrollableContainer(element);
    if (!container) {
        return false;
    }
    const containerRect = getBoundingRect(getWindow, container);
    const elementRect = element.getBoundingClientRect();
    const intersectionTolerance = elementRect.height * (1 - tolerance);
    const topIntersection = Math.max(0, containerRect.top - elementRect.top);
    const bottomIntersection = Math.max(0, elementRect.bottom - containerRect.bottom);
    const totalIntersection = topIntersection + bottomIntersection;
    return (totalIntersection === 0 || totalIntersection <= intersectionTolerance);
}
export function isElementVisibleInContainer(getWindow, element, gap = 0) {
    const container = getScrollableContainer(element);
    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();
        if (elementRect.left > containerRect.right ||
            elementRect.top > containerRect.bottom ||
            elementRect.bottom < containerRect.top ||
            elementRect.right < containerRect.left) {
            return Visibilities.Invisible;
        }
        if (elementRect.top + gap >= containerRect.top &&
            elementRect.top <= containerRect.bottom &&
            elementRect.bottom >= containerRect.top &&
            elementRect.bottom - gap <= containerRect.bottom &&
            elementRect.left + gap >= containerRect.left &&
            elementRect.left <= containerRect.right &&
            elementRect.right >= containerRect.left &&
            elementRect.right - gap <= containerRect.right) {
            return Visibilities.Visible;
        }
        return Visibilities.PartiallyVisible;
    }
    return Visibilities.Invisible;
}
export function scrollIntoView(getWindow, element, alignToTop) {
    // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
    // it scrolls all of them, not just the deepest one. So, trying to work it around.
    const container = getScrollableContainer(element);
    if (container) {
        const containerRect = getBoundingRect(getWindow, container);
        const elementRect = element.getBoundingClientRect();
        if (alignToTop) {
            container.scrollTop += elementRect.top - containerRect.top;
        }
        else {
            container.scrollTop += elementRect.bottom - containerRect.bottom;
        }
    }
}
export function getScrollableContainer(element) {
    const doc = element.ownerDocument;
    if (doc) {
        for (let el = dom.getParentElement(element); el; el = dom.getParentElement(el)) {
            if (el.scrollWidth > el.clientWidth ||
                el.scrollHeight > el.clientHeight) {
                return el;
            }
        }
        return doc.documentElement;
    }
    return null;
}
export function makeFocusIgnored(element) {
    element.__shouldIgnoreFocus = true;
}
export function shouldIgnoreFocus(element) {
    return !!element.__shouldIgnoreFocus;
}
export function getUId(wnd) {
    const rnd = new Uint32Array(4);
    wnd.crypto.getRandomValues(rnd);
    const srnd = [];
    for (let i = 0; i < rnd.length; i++) {
        srnd.push(rnd[i].toString(36));
    }
    srnd.push("|");
    srnd.push((++_uidCounter).toString(36));
    srnd.push("|");
    srnd.push(Date.now().toString(36));
    return srnd.join("");
}
export function getElementUId(getWindow, element) {
    const context = getInstanceContext(getWindow);
    let uid = element.__tabsterElementUID;
    if (!uid) {
        uid = element.__tabsterElementUID = getUId(getWindow());
    }
    if (!context.elementByUId[uid] &&
        documentContains(element.ownerDocument, element)) {
        context.elementByUId[uid] = new WeakHTMLElement(element);
    }
    return uid;
}
export function getElementByUId(context, uid) {
    return context.elementByUId[uid];
}
export function getWindowUId(win) {
    let uid = win.__tabsterCrossOriginWindowUID;
    if (!uid) {
        uid = win.__tabsterCrossOriginWindowUID = getUId(win);
    }
    return uid;
}
export function clearElementCache(getWindow, parent) {
    const context = getInstanceContext(getWindow);
    for (const key of Object.keys(context.elementByUId)) {
        const wel = context.elementByUId[key];
        const el = wel && wel.get();
        if (el && parent) {
            if (!dom.nodeContains(parent, el)) {
                continue;
            }
        }
        delete context.elementByUId[key];
    }
}
// Uses `dom.nodeContains` so the shadow-DOM / iframe abstraction can override it.
export function documentContains(doc, element) {
    return dom.nodeContains(doc?.body, element);
}
export function matchesSelector(element, selector) {
    return typeof element.matches === "function" && element.matches(selector);
}
let _lastTabsterPartId = 0;
export class TabsterPart {
    _tabster;
    _element;
    _props;
    id;
    constructor(tabster, element, props) {
        this._tabster = tabster;
        this._element = new WeakHTMLElement(element);
        this._props = { ...props };
        this.id = "i" + ++_lastTabsterPartId;
    }
    getElement() {
        return this._element.get();
    }
    getProps() {
        return this._props;
    }
    setProps(props) {
        this._props = { ...props };
    }
}
export function getLastChild(container) {
    let lastChild = null;
    for (let i = dom.getLastElementChild(container); i; i = dom.getLastElementChild(i)) {
        lastChild = i;
    }
    return lastChild || undefined;
}
export function getAdjacentElement(from, prev) {
    let cur = from;
    let adjacent = null;
    while (cur && !adjacent) {
        adjacent = (prev
            ? dom.getPreviousElementSibling(cur)
            : dom.getNextElementSibling(cur));
        cur = dom.getParentElement(cur);
    }
    return adjacent || undefined;
}
export function augmentAttribute(tabster, element, name, value // Restore original value when undefined.
) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entry = tabster.storageEntry(element, true);
    let ret = false;
    if (!entry.aug) {
        if (value === undefined) {
            return ret;
        }
        entry.aug = {};
    }
    if (value === undefined) {
        if (name in entry.aug) {
            const origVal = entry.aug[name];
            delete entry.aug[name];
            if (origVal === null) {
                element.removeAttribute(name);
            }
            else {
                element.setAttribute(name, origVal);
            }
            ret = true;
        }
    }
    else {
        let origValue;
        if (!(name in entry.aug)) {
            origValue = element.getAttribute(name);
        }
        if (origValue !== undefined && origValue !== value) {
            entry.aug[name] = origValue;
            if (value === null) {
                element.removeAttribute(name);
            }
            else {
                element.setAttribute(name, value);
            }
            ret = true;
        }
    }
    if (value === undefined && Object.keys(entry.aug).length === 0) {
        delete entry.aug;
        tabster.storageEntry(element, false);
    }
    return ret;
}
export function getTabsterAttributeOnElement(element) {
    if (!element.hasAttribute(TABSTER_ATTRIBUTE_NAME)) {
        return null;
    }
    // We already checked the presence with `hasAttribute`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rawAttribute = element.getAttribute(TABSTER_ATTRIBUTE_NAME);
    let tabsterAttribute;
    try {
        tabsterAttribute = JSON.parse(rawAttribute);
    }
    catch {
        console.error("Tabster: failed to parse attribute", rawAttribute);
        tabsterAttribute = {};
    }
    return tabsterAttribute;
}
export function isDisplayNone(element) {
    const elementDocument = element.ownerDocument;
    const computedStyle = elementDocument.defaultView?.getComputedStyle(element);
    // offsetParent is null for elements with display:none, display:fixed and for <body>.
    if (element.offsetParent === null &&
        elementDocument.body !== element &&
        computedStyle?.position !== "fixed") {
        return true;
    }
    // For our purposes of looking for focusable elements, visibility:hidden has the same
    // effect as display:none.
    if (computedStyle?.visibility === "hidden") {
        return true;
    }
    // if an element has display: fixed, we need to check if it is also hidden with CSS,
    // or within a parent hidden with CSS
    if (computedStyle?.position === "fixed") {
        if (computedStyle.display === "none") {
            return true;
        }
        if (element.parentElement?.offsetParent === null &&
            elementDocument.body !== element.parentElement) {
            return true;
        }
    }
    return false;
}
export function isRadio(element) {
    return (element.tagName === "INPUT" &&
        !!element.name &&
        element.type === "radio");
}
export function getRadioButtonGroup(element) {
    if (!isRadio(element)) {
        return;
    }
    const name = element.name;
    let radioButtons = Array.from(dom.getElementsByName(element, name));
    let checked;
    radioButtons = radioButtons.filter((el) => {
        if (isRadio(el)) {
            if (el.checked) {
                checked = el;
            }
            return true;
        }
        return false;
    });
    return {
        name,
        buttons: new Set(radioButtons),
        checked,
    };
}
/**
 * If the passed element is Tabster dummy input, returns the container element this dummy input belongs to.
 * @param element Element to check for being dummy input.
 * @returns Dummy input container element (if the passed element is a dummy input) or null.
 */
//# sourceMappingURL=Utils.js.map