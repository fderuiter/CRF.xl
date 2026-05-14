/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FocusedElementState", {
    enumerable: true,
    get: function() {
        return FocusedElementState;
    }
});
const _keyborg = require("keyborg");
const _Keys = require("../Keys.cjs");
const _Root = require("../Root.cjs");
const _Consts = require("../Consts.cjs");
const _Events = require("../Events.cjs");
const _DummyInput = require("../DummyInput.cjs");
const _Utils = require("../Utils.cjs");
const _Instance = require("../Instance.cjs");
const _DOMAPI = require("../DOMAPI.cjs");
const _Subscribable = require("./Subscribable.cjs");
function getUncontrolledCompletelyContainer(tabster, element) {
    const getParent = tabster.getParent;
    let el = element;
    do {
        const uncontrolledOnElement = (0, _Instance.getTabsterOnElement)(tabster, el)?.uncontrolled;
        if (uncontrolledOnElement && tabster.uncontrolled.isUncontrolledCompletely(el, !!uncontrolledOnElement.completely)) {
            return el;
        }
        el = getParent(el);
    }while (el)
    return undefined;
}
const AsyncFocusIntentPriorityBySource = {
    [_Consts.AsyncFocusSources.Restorer]: 0,
    [_Consts.AsyncFocusSources.Deloser]: 1,
    [_Consts.AsyncFocusSources.EscapeGroupper]: 2
};
class FocusedElementState extends _Subscribable.Subscribable {
    static _lastResetElement;
    static _isTabbingTimer;
    static isTabbing = false;
    _tabster;
    _win;
    _nextVal;
    _lastVal;
    _asyncFocus;
    constructor(tabster, getWindow){
        super();
        this._tabster = tabster;
        this._win = getWindow;
        tabster.queueInit(this._init);
    }
    _init = ()=>{
        const win = this._win();
        const doc = win.document;
        // Add these event listeners as capture - we want Tabster to run before user event handlers
        doc.addEventListener(_keyborg.KEYBORG_FOCUSIN, this._onFocusIn, true);
        doc.addEventListener(_keyborg.KEYBORG_FOCUSOUT, this._onFocusOut, true);
        win.addEventListener("keydown", this._onKeyDown, true);
        const activeElement = _DOMAPI.dom.getActiveElement(doc);
        if (activeElement && activeElement !== doc.body) {
            this._setFocusedElement(activeElement);
        }
        this.subscribe(this._onChanged);
    };
    dispose() {
        super.dispose();
        const win = this._win();
        const doc = win.document;
        doc.removeEventListener(_keyborg.KEYBORG_FOCUSIN, this._onFocusIn, true);
        doc.removeEventListener(_keyborg.KEYBORG_FOCUSOUT, this._onFocusOut, true);
        win.removeEventListener("keydown", this._onKeyDown, true);
        this.unsubscribe(this._onChanged);
        const asyncFocus = this._asyncFocus;
        if (asyncFocus) {
            win.clearTimeout(asyncFocus.timeout);
            delete this._asyncFocus;
        }
        delete FocusedElementState._lastResetElement;
        delete this._nextVal;
        delete this._lastVal;
    }
    static forgetMemorized(instance, parent) {
        let wel = FocusedElementState._lastResetElement;
        let el = wel && wel.get();
        if (el && _DOMAPI.dom.nodeContains(parent, el)) {
            delete FocusedElementState._lastResetElement;
        }
        el = instance._nextVal?.element?.get();
        if (el && _DOMAPI.dom.nodeContains(parent, el)) {
            delete instance._nextVal;
        }
        wel = instance._lastVal;
        el = wel && wel.get();
        if (el && _DOMAPI.dom.nodeContains(parent, el)) {
            delete instance._lastVal;
        }
    }
    getFocusedElement() {
        return this.getVal();
    }
    getLastFocusedElement() {
        let el = this._lastVal?.get();
        if (!el || el && !(0, _Utils.documentContains)(el.ownerDocument, el)) {
            this._lastVal = el = undefined;
        }
        return el;
    }
    focus(element, noFocusedProgrammaticallyFlag, noAccessibleCheck, preventScroll) {
        if (!this._tabster.focusable.isFocusable(element, noFocusedProgrammaticallyFlag, false, noAccessibleCheck)) {
            return false;
        }
        element.focus({
            preventScroll
        });
        return true;
    }
    focusDefault(container) {
        const el = this._tabster.focusable.findDefault({
            container
        });
        if (el) {
            this._tabster.focusedElement.focus(el);
            return true;
        }
        return false;
    }
    getFirstOrLastTabbable(isFirst, props) {
        const { container, ignoreAccessibility } = props;
        let toFocus;
        if (container) {
            const ctx = _Root.RootAPI.getTabsterContext(this._tabster, container);
            if (ctx) {
                toFocus = FocusedElementState.findNextTabbable(this._tabster, ctx, container, undefined, undefined, !isFirst, ignoreAccessibility)?.element;
            }
        }
        if (toFocus && !_DOMAPI.dom.nodeContains(container, toFocus)) {
            toFocus = undefined;
        }
        return toFocus || undefined;
    }
    _focusFirstOrLast(isFirst, props) {
        const toFocus = this.getFirstOrLastTabbable(isFirst, props);
        if (toFocus) {
            this.focus(toFocus, false, true);
            return true;
        }
        return false;
    }
    focusFirst(props) {
        return this._focusFirstOrLast(true, props);
    }
    focusLast(props) {
        return this._focusFirstOrLast(false, props);
    }
    resetFocus(container) {
        if (!this._tabster.focusable.isVisible(container)) {
            return false;
        }
        if (!this._tabster.focusable.isFocusable(container, true, true, true)) {
            const prevTabIndex = container.getAttribute("tabindex");
            const prevAriaHidden = container.getAttribute("aria-hidden");
            container.tabIndex = -1;
            container.setAttribute("aria-hidden", "true");
            FocusedElementState._lastResetElement = new _Utils.WeakHTMLElement(container);
            this.focus(container, true, true);
            this._setOrRemoveAttribute(container, "tabindex", prevTabIndex);
            this._setOrRemoveAttribute(container, "aria-hidden", prevAriaHidden);
        } else {
            this.focus(container);
        }
        return true;
    }
    requestAsyncFocus(source, callback, delay) {
        const win = this._tabster.getWindow();
        const currentAsyncFocus = this._asyncFocus;
        if (currentAsyncFocus) {
            if (AsyncFocusIntentPriorityBySource[source] > AsyncFocusIntentPriorityBySource[currentAsyncFocus.source]) {
                // Previously registered intent has higher priority.
                return;
            }
            // New intent has higher priority.
            win.clearTimeout(currentAsyncFocus.timeout);
        }
        this._asyncFocus = {
            source,
            callback,
            timeout: win.setTimeout(()=>{
                this._asyncFocus = undefined;
                callback();
            }, delay)
        };
    }
    cancelAsyncFocus(source) {
        const asyncFocus = this._asyncFocus;
        if (asyncFocus?.source === source) {
            this._tabster.getWindow().clearTimeout(asyncFocus.timeout);
            this._asyncFocus = undefined;
        }
    }
    _setOrRemoveAttribute(element, name, value) {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }
    _setFocusedElement(element, relatedTarget, isFocusedProgrammatically) {
        if (this._tabster._noop) {
            return;
        }
        const detail = {
            relatedTarget
        };
        if (element) {
            const lastResetElement = FocusedElementState._lastResetElement?.get();
            FocusedElementState._lastResetElement = undefined;
            if (lastResetElement === element || (0, _Utils.shouldIgnoreFocus)(element)) {
                return;
            }
            detail.isFocusedProgrammatically = isFocusedProgrammatically;
            const ctx = _Root.RootAPI.getTabsterContext(this._tabster, element);
            const modalizerId = ctx?.modalizer?.userId;
            if (modalizerId) {
                detail.modalizerId = modalizerId;
            }
        }
        const nextVal = this._nextVal = {
            element: element ? new _Utils.WeakHTMLElement(element) : undefined,
            detail
        };
        if (element && element !== this._val) {
            this._validateFocusedElement(element);
        }
        // _validateFocusedElement() might cause the refocus which will trigger
        // another call to this function. Making sure that the value is correct.
        if (this._nextVal === nextVal) {
            this.setVal(element, detail);
        }
        this._nextVal = undefined;
    }
    setVal(val, detail) {
        super.setVal(val, detail);
        if (val) {
            this._lastVal = new _Utils.WeakHTMLElement(val);
        }
    }
    _onFocusIn = (e)=>{
        const target = e.composedPath()[0];
        if (target) {
            this._setFocusedElement(target, e.detail.relatedTarget, e.detail.isFocusedProgrammatically);
        }
    };
    _onFocusOut = (e)=>{
        this._setFocusedElement(undefined, e.detail?.originalEvent.relatedTarget);
    };
    static findNextTabbable(tabster, ctx, container, currentElement, referenceElement, isBackward, ignoreAccessibility) {
        const actualContainer = container || ctx.root.getElement();
        if (!actualContainer) {
            return null;
        }
        let next = null;
        const isTabbingTimer = FocusedElementState._isTabbingTimer;
        const win = tabster.getWindow();
        if (isTabbingTimer) {
            win.clearTimeout(isTabbingTimer);
        }
        FocusedElementState.isTabbing = true;
        FocusedElementState._isTabbingTimer = win.setTimeout(()=>{
            delete FocusedElementState._isTabbingTimer;
            FocusedElementState.isTabbing = false;
        }, 0);
        const modalizer = ctx.modalizer;
        const groupper = ctx.groupper;
        const mover = ctx.mover;
        const callFindNext = (what)=>{
            next = what.findNextTabbable(currentElement, referenceElement, isBackward, ignoreAccessibility);
            if (currentElement && !next?.element) {
                const parentElement = what !== modalizer && _DOMAPI.dom.getParentElement(what.getElement());
                if (parentElement) {
                    const parentCtx = _Root.RootAPI.getTabsterContext(tabster, currentElement, {
                        referenceElement: parentElement
                    });
                    if (parentCtx) {
                        const currentScopeElement = what.getElement();
                        const newCurrent = isBackward ? currentScopeElement : currentScopeElement && (0, _Utils.getLastChild)(currentScopeElement) || currentScopeElement;
                        if (newCurrent) {
                            next = FocusedElementState.findNextTabbable(tabster, parentCtx, container, newCurrent, parentElement, isBackward, ignoreAccessibility);
                            if (next) {
                                next.outOfDOMOrder = true;
                            }
                        }
                    }
                }
            }
        };
        if (groupper && mover) {
            callFindNext(ctx.groupperBeforeMover ? groupper : mover);
        } else if (groupper) {
            callFindNext(groupper);
        } else if (mover) {
            callFindNext(mover);
        } else if (modalizer) {
            callFindNext(modalizer);
        } else {
            const findProps = {
                container: actualContainer,
                currentElement,
                referenceElement,
                ignoreAccessibility,
                useActiveModalizer: true
            };
            const findPropsOut = {};
            const nextElement = tabster.focusable[isBackward ? "findPrev" : "findNext"](findProps, findPropsOut);
            next = {
                element: nextElement,
                outOfDOMOrder: findPropsOut.outOfDOMOrder,
                uncontrolled: findPropsOut.uncontrolled
            };
        }
        return next;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _validateFocusedElement = (element)=>{
    // TODO: Make sure this is not needed anymore and write tests.
    };
    _onKeyDown = (event)=>{
        if (event.key !== _Keys.Keys.Tab || event.ctrlKey) {
            return;
        }
        const currentElement = this.getVal();
        if (!currentElement || !currentElement.ownerDocument || currentElement.contentEditable === "true") {
            return;
        }
        const tabster = this._tabster;
        const controlTab = tabster.controlTab;
        const ctx = _Root.RootAPI.getTabsterContext(tabster, currentElement);
        if (!ctx || ctx.ignoreKeydown(event)) {
            return;
        }
        const isBackward = event.shiftKey;
        const next = FocusedElementState.findNextTabbable(tabster, ctx, undefined, currentElement, undefined, isBackward, true);
        const rootElement = ctx.root.getElement();
        if (!rootElement) {
            return;
        }
        const nextElement = next?.element;
        const uncontrolledCompletelyContainer = getUncontrolledCompletelyContainer(tabster, currentElement);
        if (nextElement) {
            const nextUncontrolled = next.uncontrolled;
            if (ctx.uncontrolled || _DOMAPI.dom.nodeContains(nextUncontrolled, currentElement)) {
                if (!next.outOfDOMOrder && nextUncontrolled === ctx.uncontrolled || uncontrolledCompletelyContainer && !_DOMAPI.dom.nodeContains(uncontrolledCompletelyContainer, nextElement)) {
                    // Nothing to do, everything will be done by the browser or something
                    // that controls the uncontrolled area.
                    return;
                }
                // We are in uncontrolled area. We allow whatever controls it to move
                // focus, but we add a phantom dummy to make sure the focus is moved
                // to the correct place if the uncontrolled area allows default action.
                // We only need that in the controlled mode, because in uncontrolled
                // mode we have dummy inputs around everything that redirects focus.
                _DummyInput.DummyInputManager.addPhantomDummyWithTarget(tabster, currentElement, isBackward, nextElement);
                return;
            }
            if (nextUncontrolled && tabster.focusable.isVisible(nextUncontrolled) || nextElement.tagName === "IFRAME" && tabster.focusable.isVisible(nextElement)) {
                // For iframes and uncontrolled areas we always want to use default action to
                // move focus into.
                if (rootElement.dispatchEvent(new _Events.TabsterMoveFocusEvent({
                    by: "root",
                    owner: rootElement,
                    next: nextElement,
                    relatedEvent: event
                }))) {
                    _DummyInput.DummyInputManager.moveWithPhantomDummy(tabster, nextUncontrolled ?? nextElement, false, isBackward, event);
                }
                return;
            }
            if (controlTab || next?.outOfDOMOrder) {
                if (rootElement.dispatchEvent(new _Events.TabsterMoveFocusEvent({
                    by: "root",
                    owner: rootElement,
                    next: nextElement,
                    relatedEvent: event
                }))) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    (0, _keyborg.nativeFocus)(nextElement);
                }
            } else {
            // We are in uncontrolled mode and the next element is in DOM order.
            // Just allow the default action.
            }
        } else {
            if (!uncontrolledCompletelyContainer && rootElement.dispatchEvent(new _Events.TabsterMoveFocusEvent({
                by: "root",
                owner: rootElement,
                next: null,
                relatedEvent: event
            }))) {
                ctx.root.moveOutWithDefaultAction(isBackward, event);
            }
        }
    };
    _onChanged = (element, detail)=>{
        if (element) {
            element.dispatchEvent(new _Events.TabsterFocusInEvent(detail));
        } else {
            const last = this._lastVal?.get();
            if (last) {
                const d = {
                    ...detail
                };
                const lastCtx = _Root.RootAPI.getTabsterContext(this._tabster, last);
                const modalizerId = lastCtx?.modalizer?.userId;
                if (modalizerId) {
                    d.modalizerId = modalizerId;
                }
                last.dispatchEvent(new _Events.TabsterFocusOutEvent(d));
            }
        }
    };
} //# sourceMappingURL=FocusedElement.js.map
