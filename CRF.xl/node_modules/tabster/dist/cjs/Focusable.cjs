/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FocusableAPI", {
    enumerable: true,
    get: function() {
        return FocusableAPI;
    }
});
const _Instance = require("./Instance.cjs");
const _Root = require("./Root.cjs");
const _Consts = require("./Consts.cjs");
const _DummyInput = require("./DummyInput.cjs");
const _Utils = require("./Utils.cjs");
const _DOMAPI = require("./DOMAPI.cjs");
class FocusableAPI {
    _tabster;
    constructor(tabster){
        this._tabster = tabster;
    }
    dispose() {
    /**/ }
    getProps(element) {
        const tabsterOnElement = (0, _Instance.getTabsterOnElement)(this._tabster, element);
        return tabsterOnElement && tabsterOnElement.focusable || {};
    }
    isFocusable(el, includeProgrammaticallyFocusable, noVisibleCheck, noAccessibleCheck) {
        if ((0, _Utils.matchesSelector)(el, _Consts.FOCUSABLE_SELECTOR) && (includeProgrammaticallyFocusable || el.tabIndex !== -1)) {
            return (noVisibleCheck || this.isVisible(el)) && (noAccessibleCheck || this.isAccessible(el));
        }
        return false;
    }
    isVisible(el) {
        if (!el.ownerDocument || el.nodeType !== Node.ELEMENT_NODE) {
            return false;
        }
        if ((0, _Utils.isDisplayNone)(el)) {
            return false;
        }
        const rect = el.ownerDocument.body.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            // This might happen, for example, if our <body> is in hidden <iframe>.
            return false;
        }
        return true;
    }
    isAccessible(el) {
        for(let e = el; e; e = _DOMAPI.dom.getParentElement(e)){
            const tabsterOnElement = (0, _Instance.getTabsterOnElement)(this._tabster, e);
            if (this._isHidden(e)) {
                return false;
            }
            const ignoreDisabled = tabsterOnElement?.focusable?.ignoreAriaDisabled;
            if (!ignoreDisabled && this._isDisabled(e)) {
                return false;
            }
        }
        return true;
    }
    _isDisabled(el) {
        return el.hasAttribute("disabled");
    }
    _isHidden(el) {
        const attrVal = el.getAttribute("aria-hidden");
        if (attrVal && attrVal.toLowerCase() === "true") {
            if (!this._tabster.modalizer?.isAugmented(el)) {
                return true;
            }
        }
        return false;
    }
    findFirst(options, out) {
        return this.findElement({
            ...options
        }, out);
    }
    findLast(options, out) {
        return this.findElement({
            isBackward: true,
            ...options
        }, out);
    }
    findNext(options, out) {
        return this.findElement({
            ...options
        }, out);
    }
    findPrev(options, out) {
        return this.findElement({
            ...options,
            isBackward: true
        }, out);
    }
    findDefault(options, out) {
        return this.findElement({
            ...options,
            acceptCondition: (el)=>this.isFocusable(el, options.includeProgrammaticallyFocusable) && !!this.getProps(el).isDefault
        }, out) || null;
    }
    findAll(options) {
        return this._findElements(true, options) || [];
    }
    findElement(options, out) {
        const found = this._findElements(false, options, out);
        return found ? found[0] : found;
    }
    _findElements(isFindAll, options, out) {
        const { container, currentElement = null, includeProgrammaticallyFocusable, useActiveModalizer, ignoreAccessibility, modalizerId, isBackward, onElement } = options;
        if (!out) {
            out = {};
        }
        const elements = [];
        let { acceptCondition } = options;
        const hasCustomCondition = !!acceptCondition;
        if (!container) {
            return null;
        }
        if (!acceptCondition) {
            acceptCondition = (el)=>this.isFocusable(el, includeProgrammaticallyFocusable, false, ignoreAccessibility);
        }
        const acceptElementState = {
            container,
            modalizerUserId: modalizerId === undefined && useActiveModalizer ? this._tabster.modalizer?.activeId : modalizerId || _Root.RootAPI.getTabsterContext(this._tabster, container)?.modalizer?.userId,
            from: currentElement || container,
            isBackward,
            isFindAll,
            acceptCondition,
            hasCustomCondition,
            includeProgrammaticallyFocusable,
            ignoreAccessibility,
            cachedGrouppers: {},
            cachedRadioGroups: {}
        };
        const walker = (0, _Utils.createElementTreeWalker)(container.ownerDocument, container, (node)=>this._acceptElement(node, acceptElementState));
        if (!walker) {
            return null;
        }
        const prepareForNextElement = (shouldContinueIfNotFound)=>{
            const foundElement = acceptElementState.foundElement ?? acceptElementState.foundBackward;
            if (foundElement) {
                elements.push(foundElement);
            }
            if (isFindAll) {
                if (foundElement) {
                    acceptElementState.found = false;
                    delete acceptElementState.foundElement;
                    delete acceptElementState.foundBackward;
                    delete acceptElementState.fromCtx;
                    acceptElementState.from = foundElement;
                    if (onElement && !onElement(foundElement)) {
                        return false;
                    }
                }
                return !!(foundElement || shouldContinueIfNotFound);
            } else {
                if (foundElement && out) {
                    out.uncontrolled = _Root.RootAPI.getTabsterContext(this._tabster, foundElement)?.uncontrolled;
                }
                return !!(shouldContinueIfNotFound && !foundElement);
            }
        };
        if (!currentElement) {
            out.outOfDOMOrder = true;
        }
        if (currentElement && _DOMAPI.dom.nodeContains(container, currentElement)) {
            walker.currentNode = currentElement;
        } else if (isBackward) {
            const lastChild = (0, _Utils.getLastChild)(container);
            if (!lastChild) {
                return null;
            }
            if (this._acceptElement(lastChild, acceptElementState) === NodeFilter.FILTER_ACCEPT && !prepareForNextElement(true)) {
                if (acceptElementState.skippedFocusable) {
                    out.outOfDOMOrder = true;
                }
                return elements;
            }
            walker.currentNode = lastChild;
        }
        do {
            if (isBackward) {
                walker.previousNode();
            } else {
                walker.nextNode();
            }
        }while (prepareForNextElement())
        if (acceptElementState.skippedFocusable) {
            out.outOfDOMOrder = true;
        }
        return elements.length ? elements : null;
    }
    _acceptElement(element, state) {
        if (state.found) {
            return NodeFilter.FILTER_ACCEPT;
        }
        const foundBackward = state.foundBackward;
        if (foundBackward && (element === foundBackward || !_DOMAPI.dom.nodeContains(foundBackward, element))) {
            state.found = true;
            state.foundElement = foundBackward;
            return NodeFilter.FILTER_ACCEPT;
        }
        const container = state.container;
        if (element === container) {
            return NodeFilter.FILTER_SKIP;
        }
        if (!_DOMAPI.dom.nodeContains(container, element)) {
            return NodeFilter.FILTER_REJECT;
        }
        if ((0, _DummyInput.getDummyInputContainer)(element)) {
            return NodeFilter.FILTER_REJECT;
        }
        if (_DOMAPI.dom.nodeContains(state.rejectElementsFrom, element)) {
            return NodeFilter.FILTER_REJECT;
        }
        const ctx = state.currentCtx = _Root.RootAPI.getTabsterContext(this._tabster, element);
        // Tabster is opt in, if it is not managed, don't try and get do anything special
        if (!ctx) {
            return NodeFilter.FILTER_SKIP;
        }
        if ((0, _Utils.shouldIgnoreFocus)(element)) {
            if (this.isFocusable(element, undefined, true, true)) {
                state.skippedFocusable = true;
            }
            return NodeFilter.FILTER_SKIP;
        }
        // We assume iframes are focusable because native tab behaviour would tab inside.
        // But we do it only during the standard search when there is no custom accept
        // element condition.
        if (!state.hasCustomCondition && (element.tagName === "IFRAME" || element.tagName === "WEBVIEW")) {
            if (this.isVisible(element) && ctx.modalizer?.userId === this._tabster.modalizer?.activeId) {
                state.found = true;
                state.rejectElementsFrom = state.foundElement = element;
                return NodeFilter.FILTER_ACCEPT;
            } else {
                return NodeFilter.FILTER_REJECT;
            }
        }
        if (!state.ignoreAccessibility && !this.isAccessible(element)) {
            if (this.isFocusable(element, false, true, true)) {
                state.skippedFocusable = true;
            }
            return NodeFilter.FILTER_REJECT;
        }
        let result;
        let fromCtx = state.fromCtx;
        if (!fromCtx) {
            fromCtx = state.fromCtx = _Root.RootAPI.getTabsterContext(this._tabster, state.from);
        }
        const fromMover = fromCtx?.mover;
        let groupper = ctx.groupper;
        let mover = ctx.mover;
        result = this._tabster.modalizer?.acceptElement(element, state);
        if (result !== undefined) {
            state.skippedFocusable = true;
        }
        if (result === undefined && (groupper || mover || fromMover)) {
            const groupperElement = groupper?.getElement();
            const fromMoverElement = fromMover?.getElement();
            let moverElement = mover?.getElement();
            if (moverElement && _DOMAPI.dom.nodeContains(fromMoverElement, moverElement) && _DOMAPI.dom.nodeContains(container, fromMoverElement) && (!groupperElement || !mover || _DOMAPI.dom.nodeContains(fromMoverElement, groupperElement))) {
                mover = fromMover;
                moverElement = fromMoverElement;
            }
            if (groupperElement) {
                if (groupperElement === container || !_DOMAPI.dom.nodeContains(container, groupperElement)) {
                    groupper = undefined;
                } else if (!_DOMAPI.dom.nodeContains(groupperElement, element)) {
                    // _acceptElement() callback is called during the tree walking.
                    // Given the potentiality of virtual parents (driven by the custom getParent() function),
                    // we need to make sure that the groupper from the current element's context is not,
                    // portaling us out of the DOM order.
                    return NodeFilter.FILTER_REJECT;
                }
            }
            if (moverElement) {
                if (!_DOMAPI.dom.nodeContains(container, moverElement)) {
                    mover = undefined;
                } else if (!_DOMAPI.dom.nodeContains(moverElement, element)) {
                    // _acceptElement() callback is called during the tree walking.
                    // Given the potentiality of virtual parents (driven by the custom getParent() function),
                    // we need to make sure that the mover from the current element's context is not,
                    // portaling us out of the DOM order.
                    return NodeFilter.FILTER_REJECT;
                }
            }
            if (groupper && mover) {
                if (moverElement && groupperElement && !_DOMAPI.dom.nodeContains(groupperElement, moverElement)) {
                    mover = undefined;
                } else {
                    groupper = undefined;
                }
            }
            if (groupper) {
                result = groupper.acceptElement(element, state);
            }
            if (mover) {
                result = mover.acceptElement(element, state);
            }
        }
        if (result === undefined) {
            result = state.acceptCondition(element) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            if (result === NodeFilter.FILTER_SKIP && this.isFocusable(element, false, true, true)) {
                state.skippedFocusable = true;
            }
        }
        if (result === NodeFilter.FILTER_ACCEPT && !state.found) {
            if (!state.isFindAll && (0, _Utils.isRadio)(element) && !element.checked) {
                // We need to mimic the browser's behaviour to skip unchecked radio buttons.
                const radioGroupName = element.name;
                let radioGroup = state.cachedRadioGroups[radioGroupName];
                if (!radioGroup) {
                    radioGroup = (0, _Utils.getRadioButtonGroup)(element);
                    if (radioGroup) {
                        state.cachedRadioGroups[radioGroupName] = radioGroup;
                    }
                }
                if (radioGroup?.checked && radioGroup.checked !== element) {
                    // Currently found element is a radio button in a group that has another radio button checked.
                    return NodeFilter.FILTER_SKIP;
                }
            }
            if (state.isBackward) {
                // When TreeWalker goes backwards, it visits the container first,
                // then it goes inside. So, if the container is accepted, we remember it,
                // but allowing the TreeWalker to check inside.
                state.foundBackward = element;
                result = NodeFilter.FILTER_SKIP;
            } else {
                state.found = true;
                state.foundElement = element;
            }
        }
        return result;
    }
} //# sourceMappingURL=Focusable.js.map
