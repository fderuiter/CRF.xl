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
    get Modalizer () {
        return Modalizer;
    },
    get ModalizerAPI () {
        return ModalizerAPI;
    }
});
const _keyborg = require("keyborg");
const _Instance = require("./Instance.cjs");
const _Root = require("./Root.cjs");
const _FocusedElement = require("./State/FocusedElement.cjs");
const _Keys = require("./Keys.cjs");
const _Events = require("./Events.cjs");
const _DummyInput = require("./DummyInput.cjs");
const _Utils = require("./Utils.cjs");
const _DOMAPI = require("./DOMAPI.cjs");
let _wasFocusedCounter = 0;
const _ariaHidden = "aria-hidden";
function _setInformativeStyle(weakElement, remove, internalId, userId, isActive, wasFocused) {
    if (process.env.NODE_ENV === 'development') {
        const element = weakElement.get();
        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-modalizer");
            } else {
                element.style.setProperty("--tabster-modalizer", internalId + "," + userId + "," + (isActive ? "active" : "inactive") + "," + "," + (wasFocused ? `focused(${wasFocused})` : "not-focused"));
            }
        }
    }
}
/**
 * Manages the dummy inputs for the Modalizer.
 */ class ModalizerDummyManager extends _DummyInput.DummyInputManager {
    constructor(element, tabster, sys){
        super(tabster, element, _DummyInput.DummyInputManagerPriorities.Modalizer, sys);
        this._setHandlers((dummyInput, isBackward)=>{
            const el = element.get();
            const container = el && _Root.RootAPI.getRoot(tabster, el)?.getElement();
            const input = dummyInput.input;
            let toFocus;
            if (container && input) {
                const dummyContainer = (0, _DummyInput.getDummyInputContainer)(input);
                const ctx = _Root.RootAPI.getTabsterContext(tabster, dummyContainer || input);
                if (ctx) {
                    toFocus = _FocusedElement.FocusedElementState.findNextTabbable(tabster, ctx, container, input, undefined, isBackward, true)?.element;
                }
                if (toFocus) {
                    (0, _keyborg.nativeFocus)(toFocus);
                }
            }
        });
    }
}
class Modalizer extends _Utils.TabsterPart {
    userId;
    _isActive;
    _wasFocused = 0;
    _onDispose;
    _activeElements;
    dummyManager;
    constructor(tabster, element, onDispose, props, sys, activeElements){
        super(tabster, element, props);
        this.userId = props.id;
        this._onDispose = onDispose;
        this._activeElements = activeElements;
        if (!tabster.controlTab) {
            this.dummyManager = new ModalizerDummyManager(this._element, tabster, sys);
        }
        if (process.env.NODE_ENV === 'development') {
            _setInformativeStyle(this._element, false, this.id, this.userId, this._isActive, this._wasFocused);
        }
    }
    makeActive(isActive) {
        if (this._isActive !== isActive) {
            this._isActive = isActive;
            const element = this.getElement();
            if (element) {
                const activeElements = this._activeElements;
                const index = activeElements.map((e)=>e.get()).indexOf(element);
                if (isActive) {
                    if (index < 0) {
                        activeElements.push(new _Utils.WeakHTMLElement(element));
                    }
                } else {
                    if (index >= 0) {
                        activeElements.splice(index, 1);
                    }
                }
            }
            if (process.env.NODE_ENV === 'development') {
                _setInformativeStyle(this._element, false, this.id, this.userId, this._isActive, this._wasFocused);
            }
            this._dispatchEvent(isActive);
        }
    }
    focused(noIncrement) {
        if (!noIncrement) {
            this._wasFocused = ++_wasFocusedCounter;
        }
        return this._wasFocused;
    }
    setProps(props) {
        if (props.id) {
            this.userId = props.id;
        }
        this._props = {
            ...props
        };
    }
    dispose() {
        this.makeActive(false);
        this._onDispose(this);
        this.dummyManager?.dispose();
        delete this.dummyManager;
        this._activeElements = [];
        this._remove();
    }
    isActive() {
        return !!this._isActive;
    }
    contains(element) {
        return _DOMAPI.dom.nodeContains(this.getElement(), element);
    }
    findNextTabbable(currentElement, referenceElement, isBackward, ignoreAccessibility) {
        const modalizerElement = this.getElement();
        if (!modalizerElement) {
            return null;
        }
        const tabster = this._tabster;
        let next = null;
        let outOfDOMOrder = false;
        let uncontrolled;
        const container = currentElement && _Root.RootAPI.getRoot(tabster, currentElement)?.getElement();
        if (container) {
            const findProps = {
                container,
                currentElement,
                referenceElement,
                ignoreAccessibility,
                useActiveModalizer: true
            };
            const findPropsOut = {};
            next = tabster.focusable[isBackward ? "findPrev" : "findNext"](findProps, findPropsOut);
            if (!next && this._props.isTrapped && tabster.modalizer?.activeId) {
                next = tabster.focusable[isBackward ? "findLast" : "findFirst"]({
                    container,
                    ignoreAccessibility,
                    useActiveModalizer: true
                }, findPropsOut);
                if (next === null) {
                    next = currentElement;
                }
                outOfDOMOrder = true;
            } else {
                outOfDOMOrder = !!findPropsOut.outOfDOMOrder;
            }
            uncontrolled = findPropsOut.uncontrolled;
        }
        return {
            element: next,
            uncontrolled,
            outOfDOMOrder
        };
    }
    _dispatchEvent(isActive, allElements) {
        const element = this.getElement();
        let defaultPrevented = false;
        if (element) {
            const elements = allElements ? this._activeElements.map((e)=>e.get()) : [
                element
            ];
            for (const el of elements){
                if (el) {
                    const eventDetail = {
                        id: this.userId,
                        element
                    };
                    const event = isActive ? new _Events.ModalizerActiveEvent(eventDetail) : new _Events.ModalizerInactiveEvent(eventDetail);
                    el.dispatchEvent(event);
                    if (event.defaultPrevented) {
                        defaultPrevented = true;
                    }
                }
            }
        }
        return defaultPrevented;
    }
    _remove() {
        if (process.env.NODE_ENV === 'development') {
            _setInformativeStyle(this._element, true);
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateModalizerProps(props) {
// TODO: Implement validation.
}
class ModalizerAPI {
    _tabster;
    _win;
    _restoreModalizerFocusTimer;
    _modalizers;
    _parts;
    _augMap;
    _aug;
    _hiddenUpdateTimer;
    _alwaysAccessibleSelector;
    _accessibleCheck;
    _activationHistory;
    activeId;
    currentIsOthersAccessible;
    activeElements;
    constructor(tabster, // @deprecated use accessibleCheck.
    alwaysAccessibleSelector, accessibleCheck){
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._modalizers = {};
        this._parts = {};
        this._augMap = new WeakMap();
        this._aug = [];
        this._alwaysAccessibleSelector = alwaysAccessibleSelector;
        this._accessibleCheck = accessibleCheck;
        this._activationHistory = [];
        this.activeElements = [];
        if (!tabster.controlTab) {
            tabster.root.addDummyInputs();
        }
        const win = this._win();
        win.addEventListener("keydown", this._onKeyDown, true);
        tabster.queueInit(()=>{
            this._tabster.focusedElement.subscribe(this._onFocus);
        });
    }
    dispose() {
        const win = this._win();
        win.removeEventListener("keydown", this._onKeyDown, true);
        // Dispose all modalizers managed by the API
        Object.keys(this._modalizers).forEach((modalizerId)=>{
            if (this._modalizers[modalizerId]) {
                this._modalizers[modalizerId].dispose();
                delete this._modalizers[modalizerId];
            }
        });
        win.clearTimeout(this._restoreModalizerFocusTimer);
        win.clearTimeout(this._hiddenUpdateTimer);
        this._parts = {};
        delete this.activeId;
        this.activeElements = [];
        this._augMap = new WeakMap();
        this._aug = [];
        this._tabster.focusedElement.unsubscribe(this._onFocus);
    }
    createModalizer(element, props, sys) {
        if (process.env.NODE_ENV === 'development') {
            validateModalizerProps(props);
        }
        const modalizer = new Modalizer(this._tabster, element, this._onModalizerDispose, props, sys, this.activeElements);
        const id = modalizer.id;
        const userId = props.id;
        this._modalizers[id] = modalizer;
        let part = this._parts[userId];
        if (!part) {
            part = this._parts[userId] = {};
        }
        part[id] = modalizer;
        const focusedElement = this._tabster.focusedElement.getFocusedElement() ?? null;
        // Adding a modalizer which is already focused, activate it
        if (element !== focusedElement && _DOMAPI.dom.nodeContains(element, focusedElement)) {
            if (userId !== this.activeId) {
                this.setActive(modalizer);
            } else {
                modalizer.makeActive(true);
            }
        }
        return modalizer;
    }
    _onModalizerDispose = (modalizer)=>{
        const id = modalizer.id;
        const userId = modalizer.userId;
        const part = this._parts[userId];
        delete this._modalizers[id];
        if (part) {
            delete part[id];
            if (Object.keys(part).length === 0) {
                delete this._parts[userId];
                const activationHistory = this._activationHistory;
                const cleanActivationHistory = [];
                let prevHistoryItem;
                // The history order is from most recent to oldest.
                for(let i = activationHistory.length; i--;){
                    // Remove from activation history, making sure there are no duplicates
                    // for cases like [modal2, modal1, modal2, modal1]: just removing modal2
                    // will result in [modal1, modal1] and we want just [modal1]. Otherwise,
                    // there is a chance for this array to grow forever in a narrow case of
                    // a modalizer that stays in DOM forever and is being activated/deactivated
                    // switching between other modalizers that come and go.
                    const modalizerUserIdFromHistory = activationHistory[i];
                    if (modalizerUserIdFromHistory === userId) {
                        continue;
                    }
                    if (modalizerUserIdFromHistory !== prevHistoryItem) {
                        prevHistoryItem = modalizerUserIdFromHistory;
                        if (modalizerUserIdFromHistory || cleanActivationHistory.length > 0) {
                            cleanActivationHistory.unshift(modalizerUserIdFromHistory);
                        }
                    }
                }
                this._activationHistory = cleanActivationHistory;
                if (this.activeId === userId) {
                    const prevActiveId = cleanActivationHistory[0];
                    const prevActive = prevActiveId ? Object.values(this._parts[prevActiveId])[0] : undefined;
                    this.setActive(prevActive);
                }
            }
        }
    };
    _onKeyDown = (event)=>{
        if (event.key !== _Keys.Keys.Escape) {
            return;
        }
        const tabster = this._tabster;
        const element = tabster.focusedElement.getFocusedElement();
        if (element) {
            const ctx = _Root.RootAPI.getTabsterContext(tabster, element);
            const modalizer = ctx?.modalizer;
            if (ctx && !ctx.groupper && modalizer?.isActive() && !ctx.ignoreKeydown(event)) {
                const activeId = modalizer.userId;
                if (activeId) {
                    const part = this._parts[activeId];
                    if (part) {
                        const focusedSince = Object.keys(part).map((id)=>{
                            const m = part[id];
                            const el = m.getElement();
                            let groupper;
                            if (el) {
                                groupper = (0, _Instance.getTabsterOnElement)(tabster, el)?.groupper;
                            }
                            return m && el && groupper ? {
                                el,
                                focusedSince: m.focused(true)
                            } : {
                                focusedSince: 0
                            };
                        }).filter((f)=>f.focusedSince > 0).sort((a, b)=>a.focusedSince > b.focusedSince ? -1 : a.focusedSince < b.focusedSince ? 1 : 0);
                        if (focusedSince.length) {
                            const groupperElement = focusedSince[0].el;
                            if (groupperElement) {
                                tabster.groupper?.handleKeyPress(groupperElement, event, true);
                            }
                        }
                    }
                }
            }
        }
    };
    isAugmented(element) {
        return this._augMap.has(element);
    }
    hiddenUpdate() {
        if (this._hiddenUpdateTimer) {
            return;
        }
        this._hiddenUpdateTimer = this._win().setTimeout(()=>{
            delete this._hiddenUpdateTimer;
            this._hiddenUpdate();
        }, 250);
    }
    setActive(modalizer) {
        const userId = modalizer?.userId;
        const activeId = this.activeId;
        if (activeId === userId) {
            return;
        }
        this.activeId = userId;
        if (activeId) {
            const part = this._parts[activeId];
            if (part) {
                for (const id of Object.keys(part)){
                    part[id].makeActive(false);
                }
            }
        }
        if (userId) {
            const part = this._parts[userId];
            if (part) {
                for (const id of Object.keys(part)){
                    part[id].makeActive(true);
                }
            }
        }
        this.currentIsOthersAccessible = modalizer?.getProps().isOthersAccessible;
        this.hiddenUpdate();
        const activationHistory = this._activationHistory;
        if (activationHistory[0] !== userId && (userId !== undefined || activationHistory.length > 0)) {
            activationHistory.unshift(userId);
        }
    }
    focus(elementFromModalizer, noFocusFirst, noFocusDefault) {
        const tabster = this._tabster;
        const ctx = _Root.RootAPI.getTabsterContext(tabster, elementFromModalizer);
        const modalizer = ctx?.modalizer;
        if (modalizer) {
            this.setActive(modalizer);
            const props = modalizer.getProps();
            const modalizerRoot = modalizer.getElement();
            if (modalizerRoot) {
                if (noFocusFirst === undefined) {
                    noFocusFirst = props.isNoFocusFirst;
                }
                if (!noFocusFirst && tabster.keyboardNavigation.isNavigatingWithKeyboard() && tabster.focusedElement.focusFirst({
                    container: modalizerRoot
                })) {
                    return true;
                }
                if (noFocusDefault === undefined) {
                    noFocusDefault = props.isNoFocusDefault;
                }
                if (!noFocusDefault && tabster.focusedElement.focusDefault(modalizerRoot)) {
                    return true;
                }
                tabster.focusedElement.resetFocus(modalizerRoot);
            }
        } else if (process.env.NODE_ENV === 'development') {
            console.error("Element is not in Modalizer.", elementFromModalizer);
        }
        return false;
    }
    activate(modalizerElementOrContainer) {
        const modalizerToActivate = modalizerElementOrContainer ? _Root.RootAPI.getTabsterContext(this._tabster, modalizerElementOrContainer)?.modalizer : undefined;
        if (!modalizerElementOrContainer || modalizerToActivate) {
            this.setActive(modalizerToActivate);
            return true;
        }
        return false;
    }
    acceptElement(element, state) {
        const modalizerUserId = state.modalizerUserId;
        const currentModalizer = state.currentCtx?.modalizer;
        if (modalizerUserId) {
            for (const e of this.activeElements){
                const el = e.get();
                if (el && (_DOMAPI.dom.nodeContains(element, el) || el === element)) {
                    // We have a part of currently active modalizer somewhere deeper in the DOM,
                    // skipping all other checks.
                    return NodeFilter.FILTER_SKIP;
                }
            }
        }
        const ret = modalizerUserId === currentModalizer?.userId || !modalizerUserId && currentModalizer?.getProps().isAlwaysAccessible ? undefined : NodeFilter.FILTER_SKIP;
        if (ret !== undefined) {
            state.skippedFocusable = true;
        }
        return ret;
    }
    _hiddenUpdate() {
        const tabster = this._tabster;
        const body = tabster.getWindow().document.body;
        const activeId = this.activeId;
        const parts = this._parts;
        const visibleElements = [];
        const hiddenElements = [];
        const alwaysAccessibleSelector = this._alwaysAccessibleSelector;
        const alwaysAccessibleElements = alwaysAccessibleSelector ? Array.from(_DOMAPI.dom.querySelectorAll(body, alwaysAccessibleSelector)) : [];
        const activeModalizerElements = [];
        for (const userId of Object.keys(parts)){
            const modalizerParts = parts[userId];
            for (const id of Object.keys(modalizerParts)){
                const modalizer = modalizerParts[id];
                const el = modalizer.getElement();
                const props = modalizer.getProps();
                const isAlwaysAccessible = props.isAlwaysAccessible;
                if (el) {
                    if (userId === activeId) {
                        activeModalizerElements.push(el);
                        if (!this.currentIsOthersAccessible) {
                            visibleElements.push(el);
                        }
                    } else if (isAlwaysAccessible) {
                        alwaysAccessibleElements.push(el);
                    } else {
                        hiddenElements.push(el);
                    }
                }
            }
        }
        const augmentedMap = this._augMap;
        const allVisibleElements = visibleElements.length > 0 ? [
            ...visibleElements,
            ...alwaysAccessibleElements
        ] : undefined;
        const newAugmented = [];
        const newAugmentedMap = new WeakMap();
        const toggle = (element, hide)=>{
            const tagName = element.tagName;
            if (tagName === "SCRIPT" || tagName === "STYLE") {
                return;
            }
            let isAugmented = false;
            if (augmentedMap.has(element)) {
                if (hide) {
                    isAugmented = true;
                } else {
                    augmentedMap.delete(element);
                    (0, _Utils.augmentAttribute)(tabster, element, _ariaHidden);
                }
            } else if (hide && !this._accessibleCheck?.(element, activeModalizerElements) && (0, _Utils.augmentAttribute)(tabster, element, _ariaHidden, "true")) {
                augmentedMap.set(element, true);
                isAugmented = true;
            }
            if (isAugmented) {
                newAugmented.push(new _Utils.WeakHTMLElement(element));
                newAugmentedMap.set(element, true);
            }
        };
        const walk = (element)=>{
            for(let el = _DOMAPI.dom.getFirstElementChild(element); el; el = _DOMAPI.dom.getNextElementSibling(el)){
                let skip = false;
                let containsModalizer = false;
                let containedByModalizer = false;
                if (allVisibleElements) {
                    const elParent = tabster.getParent(el);
                    for (const c of allVisibleElements){
                        if (el === c) {
                            skip = true;
                            break;
                        }
                        if (_DOMAPI.dom.nodeContains(el, c)) {
                            containsModalizer = true;
                            break;
                        } else if (_DOMAPI.dom.nodeContains(c, elParent)) {
                            // tabster.getParent() could be provided by the application to
                            // handle, for example, virtual parents. Making sure, we are
                            // not setting aria-hidden on elements which are virtually
                            // inside modalizer.
                            containedByModalizer = true;
                        }
                    }
                    if (containsModalizer || el.__tabsterElementFlags?.noDirectAriaHidden) {
                        walk(el);
                    } else if (!skip && !containedByModalizer) {
                        toggle(el, true);
                    }
                } else {
                    toggle(el, false);
                }
            }
        };
        if (!allVisibleElements) {
            alwaysAccessibleElements.forEach((e)=>toggle(e, false));
        }
        hiddenElements.forEach((e)=>toggle(e, true));
        if (body) {
            walk(body);
        }
        this._aug?.map((e)=>e.get()).forEach((e)=>{
            if (e && !newAugmentedMap.get(e)) {
                toggle(e, false);
            }
        });
        this._aug = newAugmented;
        this._augMap = newAugmentedMap;
    }
    /**
     * Subscribes to the focus state and handles modalizer related focus events
     * @param focusedElement - Element that is focused
     * @param detail - Additional data about the focus event
     */ _onFocus = (focusedElement, detail)=>{
        const tabster = this._tabster;
        const ctx = focusedElement && _Root.RootAPI.getTabsterContext(tabster, focusedElement);
        // Modalizer behaviour is opt in, only apply to elements that have a tabster context
        if (!ctx || !focusedElement) {
            return;
        }
        const augmentedMap = this._augMap;
        for(let e = focusedElement; e; e = _DOMAPI.dom.getParentElement(e)){
            // If the newly focused element is inside some of the hidden containers,
            // remove aria-hidden from those synchronously for the screen readers
            // to be able to read the element. The rest of aria-hiddens, will be removed
            // acynchronously for the sake of performance.
            if (augmentedMap.has(e)) {
                augmentedMap.delete(e);
                (0, _Utils.augmentAttribute)(tabster, e, _ariaHidden);
            }
        }
        let modalizer = ctx.modalizer;
        const tabsterOnFocusedElement = (0, _Instance.getTabsterOnElement)(tabster, focusedElement);
        const modalizerOnFocusedElement = tabsterOnFocusedElement?.modalizer;
        if (modalizerOnFocusedElement) {
            modalizerOnFocusedElement.focused();
            if (modalizerOnFocusedElement.userId === this.activeId && tabsterOnFocusedElement.groupper) {
                const parentElement = tabster.getParent(focusedElement);
                const parentModalizer = parentElement && _Root.RootAPI.getTabsterContext(tabster, parentElement)?.modalizer;
                if (parentModalizer) {
                    modalizer = parentModalizer;
                } else {
                    this.setActive(undefined);
                    return;
                }
            }
        }
        // An inactive groupper with the modalizer on the same node will not give the modalizer
        // in the context, yet we still want to track that the modalizer's container was focused.
        modalizer?.focused();
        if (modalizer?.userId === this.activeId) {
            this.currentIsOthersAccessible = modalizer?.getProps().isOthersAccessible;
            return;
        }
        // Developers calling `element.focus()` should change/deactivate active modalizer
        if (detail.isFocusedProgrammatically || this.currentIsOthersAccessible || modalizer?.getProps().isAlwaysAccessible) {
            this.setActive(modalizer);
        } else {
            // Focused outside of the active modalizer, try pull focus back to current modalizer
            const win = this._win();
            win.clearTimeout(this._restoreModalizerFocusTimer);
            // TODO some rendering frameworks (i.e. React) might async rerender the DOM so we need to wait for a duration
            // Figure out a better way of doing this rather than a 100ms timeout
            this._restoreModalizerFocusTimer = win.setTimeout(()=>this._restoreModalizerFocus(focusedElement), 100);
        }
    };
    /**
     * Called when an element is focused outside of an active modalizer.
     * Attempts to pull focus back into the active modalizer
     * @param outsideElement - An element being focused outside of the modalizer
     */ _restoreModalizerFocus(outsideElement) {
        const ownerDocument = outsideElement?.ownerDocument;
        if (!outsideElement || !ownerDocument) {
            return;
        }
        const focusedElement = this._tabster.focusedElement.getFocusedElement();
        const focusedElementModalizer = focusedElement && _Root.RootAPI.getTabsterContext(this._tabster, focusedElement)?.modalizer;
        if (!focusedElement || focusedElement && focusedElementModalizer?.userId === this.activeId) {
            // If there is no currently focused element, or the currently focused element
            // is in the active modalizer, we don't need to do anything.
            return;
        }
        const tabster = this._tabster;
        const ctx = _Root.RootAPI.getTabsterContext(tabster, outsideElement);
        const modalizer = ctx?.modalizer;
        const activeId = this.activeId;
        if (!modalizer && !activeId || modalizer && activeId === modalizer.userId) {
            return;
        }
        const container = ctx?.root.getElement();
        if (container) {
            let toFocus = tabster.focusable.findFirst({
                container,
                useActiveModalizer: true
            });
            if (toFocus) {
                if (outsideElement.compareDocumentPosition(toFocus) & document.DOCUMENT_POSITION_PRECEDING) {
                    toFocus = tabster.focusable.findLast({
                        container,
                        useActiveModalizer: true
                    });
                    if (!toFocus) {
                        // This only might mean that findFirst/findLast are buggy and inconsistent.
                        throw new Error("Something went wrong.");
                    }
                }
                tabster.focusedElement.focus(toFocus);
                return;
            }
        }
        // Current Modalizer doesn't seem to have focusable elements.
        // Blurring the currently focused element which is outside of the current Modalizer.
        outsideElement.blur();
    }
} //# sourceMappingURL=Modalizer.js.map
