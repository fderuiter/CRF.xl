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
    get Mover () {
        return Mover;
    },
    get MoverAPI () {
        return MoverAPI;
    }
});
const _keyborg = require("keyborg");
const _FocusedElement = require("./State/FocusedElement.cjs");
const _Instance = require("./Instance.cjs");
const _Keys = require("./Keys.cjs");
const _Root = require("./Root.cjs");
const _Consts = require("./Consts.cjs");
const _Events = require("./Events.cjs");
const _DummyInput = require("./DummyInput.cjs");
const _Utils = require("./Utils.cjs");
const _DOMAPI = require("./DOMAPI.cjs");
const _inputSelector = [
    "input",
    "textarea",
    "*[contenteditable]"
].join(", ");
class MoverDummyManager extends _DummyInput.DummyInputManager {
    _tabster;
    _getMemorized;
    constructor(element, tabster, getMemorized, sys){
        super(tabster, element, _DummyInput.DummyInputManagerPriorities.Mover, sys);
        this._tabster = tabster;
        this._getMemorized = getMemorized;
        this._setHandlers(this._onFocusDummyInput);
    }
    _onFocusDummyInput = (dummyInput)=>{
        const container = this._element.get();
        const input = dummyInput.input;
        if (container && input) {
            const ctx = _Root.RootAPI.getTabsterContext(this._tabster, container);
            let toFocus;
            if (ctx) {
                toFocus = _FocusedElement.FocusedElementState.findNextTabbable(this._tabster, ctx, undefined, input, undefined, !dummyInput.isFirst, true)?.element;
            }
            const memorized = this._getMemorized()?.get();
            if (memorized && this._tabster.focusable.isFocusable(memorized)) {
                toFocus = memorized;
            }
            if (toFocus) {
                (0, _keyborg.nativeFocus)(toFocus);
            }
        }
    };
}
// TypeScript enums produce depressing JavaScript code, so, we're just using
// a few old style constants here.
const _moverUpdateAdd = 1;
const _moverUpdateAttr = 2;
const _moverUpdateRemove = 3;
class Mover extends _Utils.TabsterPart {
    _unobserve;
    _intersectionObserver;
    _setCurrentTimer;
    _current;
    _prevCurrent;
    _visible = {};
    _fullyVisible;
    _win;
    _onDispose;
    _allElements;
    _updateQueue;
    _updateTimer;
    visibilityTolerance;
    dummyManager;
    constructor(tabster, element, onDispose, props, sys){
        super(tabster, element, props);
        this._win = tabster.getWindow;
        this.visibilityTolerance = props.visibilityTolerance ?? 0.8;
        if (this._props.trackState || this._props.visibilityAware) {
            this._intersectionObserver = new IntersectionObserver(this._onIntersection, {
                threshold: [
                    0,
                    0.25,
                    0.5,
                    0.75,
                    1
                ]
            });
            this._observeState();
        }
        this._onDispose = onDispose;
        const getMemorized = ()=>props.memorizeCurrent ? this._current : undefined;
        if (!tabster.controlTab) {
            this.dummyManager = new MoverDummyManager(this._element, tabster, getMemorized, sys);
        }
    }
    dispose() {
        this._onDispose(this);
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            delete this._intersectionObserver;
        }
        delete this._current;
        delete this._fullyVisible;
        delete this._allElements;
        delete this._updateQueue;
        if (this._unobserve) {
            this._unobserve();
            delete this._unobserve;
        }
        const win = this._win();
        if (this._setCurrentTimer) {
            win.clearTimeout(this._setCurrentTimer);
            delete this._setCurrentTimer;
        }
        if (this._updateTimer) {
            win.clearTimeout(this._updateTimer);
            delete this._updateTimer;
        }
        this.dummyManager?.dispose();
        delete this.dummyManager;
    }
    setCurrent(element) {
        if (element) {
            this._current = new _Utils.WeakHTMLElement(element);
        } else {
            this._current = undefined;
        }
        if ((this._props.trackState || this._props.visibilityAware) && !this._setCurrentTimer) {
            this._setCurrentTimer = this._win().setTimeout(()=>{
                delete this._setCurrentTimer;
                const changed = [];
                if (this._current !== this._prevCurrent) {
                    changed.push(this._current);
                    changed.push(this._prevCurrent);
                    this._prevCurrent = this._current;
                }
                for (const weak of changed){
                    const el = weak?.get();
                    if (el && this._allElements?.get(el) === this) {
                        const props = this._props;
                        if (el && (props.visibilityAware !== undefined || props.trackState)) {
                            const state = this.getState(el);
                            if (state) {
                                el.dispatchEvent(new _Events.MoverStateEvent(state));
                            }
                        }
                    }
                }
            });
        }
    }
    getCurrent() {
        return this._current?.get() || null;
    }
    findNextTabbable(currentElement, referenceElement, isBackward, ignoreAccessibility) {
        const container = this.getElement();
        const currentIsDummy = container && (0, _DummyInput.getDummyInputContainer)(currentElement) === container;
        if (!container) {
            return null;
        }
        let next = null;
        let outOfDOMOrder = false;
        let uncontrolled;
        if (this._props.tabbable || currentIsDummy || currentElement && !_DOMAPI.dom.nodeContains(container, currentElement)) {
            const findProps = {
                currentElement,
                referenceElement,
                container,
                ignoreAccessibility,
                useActiveModalizer: true
            };
            const findPropsOut = {};
            next = this._tabster.focusable[isBackward ? "findPrev" : "findNext"](findProps, findPropsOut);
            outOfDOMOrder = !!findPropsOut.outOfDOMOrder;
            uncontrolled = findPropsOut.uncontrolled;
        }
        return {
            element: next,
            uncontrolled,
            outOfDOMOrder
        };
    }
    acceptElement(element, state) {
        if (!_FocusedElement.FocusedElementState.isTabbing) {
            return state.currentCtx?.excludedFromMover ? NodeFilter.FILTER_REJECT : undefined;
        }
        const { memorizeCurrent, visibilityAware, hasDefault = true } = this._props;
        const moverElement = this.getElement();
        if (moverElement && (memorizeCurrent || visibilityAware || hasDefault) && (!_DOMAPI.dom.nodeContains(moverElement, state.from) || (0, _DummyInput.getDummyInputContainer)(state.from) === moverElement)) {
            let found;
            if (memorizeCurrent) {
                const current = this._current?.get();
                if (current && state.acceptCondition(current)) {
                    found = current;
                }
            }
            if (!found && hasDefault) {
                found = this._tabster.focusable.findDefault({
                    container: moverElement,
                    useActiveModalizer: true
                });
            }
            if (!found && visibilityAware) {
                found = this._tabster.focusable.findElement({
                    container: moverElement,
                    useActiveModalizer: true,
                    isBackward: state.isBackward,
                    acceptCondition: (el)=>{
                        const id = (0, _Utils.getElementUId)(this._win, el);
                        const visibility = this._visible[id];
                        return moverElement !== el && !!this._allElements?.get(el) && state.acceptCondition(el) && (visibility === _Consts.Visibilities.Visible || visibility === _Consts.Visibilities.PartiallyVisible && (visibilityAware === _Consts.Visibilities.PartiallyVisible || !this._fullyVisible));
                    }
                });
            }
            if (found) {
                state.found = true;
                state.foundElement = found;
                state.rejectElementsFrom = moverElement;
                state.skippedFocusable = true;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
        return undefined;
    }
    _onIntersection = (entries)=>{
        for (const entry of entries){
            const el = entry.target;
            const id = (0, _Utils.getElementUId)(this._win, el);
            let newVisibility;
            let fullyVisible = this._fullyVisible;
            if (entry.intersectionRatio >= 0.25) {
                newVisibility = entry.intersectionRatio >= 0.75 ? _Consts.Visibilities.Visible : _Consts.Visibilities.PartiallyVisible;
                if (newVisibility === _Consts.Visibilities.Visible) {
                    fullyVisible = id;
                }
            } else {
                newVisibility = _Consts.Visibilities.Invisible;
            }
            if (this._visible[id] !== newVisibility) {
                if (newVisibility === undefined) {
                    delete this._visible[id];
                    if (fullyVisible === id) {
                        delete this._fullyVisible;
                    }
                } else {
                    this._visible[id] = newVisibility;
                    this._fullyVisible = fullyVisible;
                }
                const state = this.getState(el);
                if (state) {
                    el.dispatchEvent(new _Events.MoverStateEvent(state));
                }
            }
        }
    };
    _observeState() {
        const element = this.getElement();
        if (this._unobserve || !element || typeof MutationObserver === "undefined") {
            return;
        }
        const win = this._win();
        const allElements = this._allElements = new WeakMap();
        const tabsterFocusable = this._tabster.focusable;
        let updateQueue = this._updateQueue = [];
        const observer = _DOMAPI.dom.createMutationObserver((mutations)=>{
            for (const mutation of mutations){
                const target = mutation.target;
                const removed = mutation.removedNodes;
                const added = mutation.addedNodes;
                if (mutation.type === "attributes") {
                    if (mutation.attributeName === "tabindex") {
                        updateQueue.push({
                            element: target,
                            type: _moverUpdateAttr
                        });
                    }
                } else {
                    for(let i = 0; i < removed.length; i++){
                        updateQueue.push({
                            element: removed[i],
                            type: _moverUpdateRemove
                        });
                    }
                    for(let i = 0; i < added.length; i++){
                        updateQueue.push({
                            element: added[i],
                            type: _moverUpdateAdd
                        });
                    }
                }
            }
            requestUpdate();
        });
        const setElement = (element, remove)=>{
            const current = allElements.get(element);
            if (current && remove) {
                this._intersectionObserver?.unobserve(element);
                allElements.delete(element);
            }
            if (!current && !remove) {
                allElements.set(element, this);
                this._intersectionObserver?.observe(element);
            }
        };
        const updateElement = (element)=>{
            const isFocusable = tabsterFocusable.isFocusable(element);
            const current = allElements.get(element);
            if (current) {
                if (!isFocusable) {
                    setElement(element, true);
                }
            } else {
                if (isFocusable) {
                    setElement(element);
                }
            }
        };
        const addNewElements = (element)=>{
            const { mover } = getMoverGroupper(element);
            if (mover && mover !== this) {
                if (mover.getElement() === element && tabsterFocusable.isFocusable(element)) {
                    setElement(element);
                } else {
                    return;
                }
            }
            const walker = (0, _Utils.createElementTreeWalker)(win.document, element, (node)=>{
                const { mover, groupper } = getMoverGroupper(node);
                if (mover && mover !== this) {
                    return NodeFilter.FILTER_REJECT;
                }
                const groupperFirstFocusable = groupper?.getFirst(true);
                if (groupper && groupper.getElement() !== node && groupperFirstFocusable && groupperFirstFocusable !== node) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (tabsterFocusable.isFocusable(node)) {
                    setElement(node);
                }
                return NodeFilter.FILTER_SKIP;
            });
            if (walker) {
                walker.currentNode = element;
                while(walker.nextNode()){
                /* Iterating for the sake of calling processNode() callback. */ }
            }
        };
        const removeWalk = (element)=>{
            const current = allElements.get(element);
            if (current) {
                setElement(element, true);
            }
            for(let el = _DOMAPI.dom.getFirstElementChild(element); el; el = _DOMAPI.dom.getNextElementSibling(el)){
                removeWalk(el);
            }
        };
        const requestUpdate = ()=>{
            if (!this._updateTimer && updateQueue.length) {
                this._updateTimer = win.setTimeout(()=>{
                    delete this._updateTimer;
                    for (const { element, type } of updateQueue){
                        switch(type){
                            case _moverUpdateAttr:
                                updateElement(element);
                                break;
                            case _moverUpdateAdd:
                                addNewElements(element);
                                break;
                            case _moverUpdateRemove:
                                removeWalk(element);
                                break;
                        }
                    }
                    updateQueue = this._updateQueue = [];
                }, 0);
            }
        };
        const getMoverGroupper = (element)=>{
            const ret = {};
            for(let el = element; el; el = _DOMAPI.dom.getParentElement(el)){
                const toe = (0, _Instance.getTabsterOnElement)(this._tabster, el);
                if (toe) {
                    if (toe.groupper && !ret.groupper) {
                        ret.groupper = toe.groupper;
                    }
                    if (toe.mover) {
                        ret.mover = toe.mover;
                        break;
                    }
                }
            }
            return ret;
        };
        updateQueue.push({
            element,
            type: _moverUpdateAdd
        });
        requestUpdate();
        observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "tabindex"
            ]
        });
        this._unobserve = ()=>{
            observer.disconnect();
        };
    }
    getState(element) {
        const id = (0, _Utils.getElementUId)(this._win, element);
        if (id in this._visible) {
            const visibility = this._visible[id] || _Consts.Visibilities.Invisible;
            const isCurrent = this._current ? this._current.get() === element : undefined;
            return {
                isCurrent,
                visibility
            };
        }
        return undefined;
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateMoverProps(props) {
// TODO: Implement validation.
}
/**
 * Calculates distance between two rectangles.
 *
 * @param ax1 first rectangle left
 * @param ay1 first rectangle top
 * @param ax2 first rectangle right
 * @param ay2 first rectangle bottom
 * @param bx1 second rectangle left
 * @param by1 second rectangle top
 * @param bx2 second rectangle right
 * @param by2 second rectangle bottom
 * @returns number, shortest distance between the rectangles.
 */ function getDistance(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
    const xDistance = ax2 < bx1 ? bx1 - ax2 : bx2 < ax1 ? ax1 - bx2 : 0;
    const yDistance = ay2 < by1 ? by1 - ay2 : by2 < ay1 ? ay1 - by2 : 0;
    return xDistance === 0 ? yDistance : yDistance === 0 ? xDistance : Math.sqrt(xDistance * xDistance + yDistance * yDistance);
}
class MoverAPI {
    _tabster;
    _win;
    _movers;
    _ignoredInputTimer;
    _ignoredInputResolve;
    constructor(tabster, getWindow){
        this._tabster = tabster;
        this._win = getWindow;
        this._movers = {};
        tabster.queueInit(this._init);
    }
    _init = ()=>{
        const win = this._win();
        win.addEventListener("keydown", this._onKeyDown, true);
        win.addEventListener(_Events.MoverMoveFocusEventName, this._onMoveFocus);
        win.addEventListener(_Events.MoverMemorizedElementEventName, this._onMemorizedElement);
        this._tabster.focusedElement.subscribe(this._onFocus);
    };
    dispose() {
        const win = this._win();
        this._tabster.focusedElement.unsubscribe(this._onFocus);
        this._ignoredInputResolve?.(false);
        if (this._ignoredInputTimer) {
            win.clearTimeout(this._ignoredInputTimer);
            delete this._ignoredInputTimer;
        }
        win.removeEventListener("keydown", this._onKeyDown, true);
        win.removeEventListener(_Events.MoverMoveFocusEventName, this._onMoveFocus);
        win.removeEventListener(_Events.MoverMemorizedElementEventName, this._onMemorizedElement);
        Object.keys(this._movers).forEach((moverId)=>{
            if (this._movers[moverId]) {
                this._movers[moverId].dispose();
                delete this._movers[moverId];
            }
        });
    }
    createMover(element, props, sys) {
        if (process.env.NODE_ENV === 'development') {
            validateMoverProps(props);
        }
        const newMover = new Mover(this._tabster, element, this._onMoverDispose, props, sys);
        this._movers[newMover.id] = newMover;
        return newMover;
    }
    _onMoverDispose = (mover)=>{
        delete this._movers[mover.id];
    };
    _onFocus = (element)=>{
        // When something in the app gets focused, we are making sure that
        // the relevant context Mover is aware of it.
        // Looking for the relevant context Mover from the currently
        // focused element parent, not from the element itself, because the
        // Mover element itself cannot be its own current (but might be
        // current for its parent Mover).
        let currentFocusableElement = element;
        let deepestFocusableElement = element;
        for(let el = _DOMAPI.dom.getParentElement(element); el; el = _DOMAPI.dom.getParentElement(el)){
            // We go through all Movers up from the focused element and
            // set their current element to the deepest focusable of that
            // Mover.
            const mover = (0, _Instance.getTabsterOnElement)(this._tabster, el)?.mover;
            if (mover) {
                mover.setCurrent(deepestFocusableElement);
                currentFocusableElement = undefined;
            }
            if (!currentFocusableElement && this._tabster.focusable.isFocusable(el)) {
                currentFocusableElement = deepestFocusableElement = el;
            }
        }
    };
    moveFocus(fromElement, key) {
        return this._moveFocus(fromElement, key);
    }
    _moveFocus(fromElement, key, relatedEvent) {
        const tabster = this._tabster;
        const ctx = _Root.RootAPI.getTabsterContext(tabster, fromElement, {
            checkRtl: true
        });
        if (!ctx || !ctx.mover || ctx.excludedFromMover || relatedEvent && ctx.ignoreKeydown(relatedEvent)) {
            return null;
        }
        const mover = ctx.mover;
        const container = mover.getElement();
        if (ctx.groupperBeforeMover) {
            const groupper = ctx.groupper;
            if (groupper && !groupper.isActive(true)) {
                // For the cases when we have Mover/Active Groupper/Inactive Groupper, we need to check
                // the grouppers between the current element and the current mover.
                for(let el = _DOMAPI.dom.getParentElement(groupper.getElement()); el && el !== container; el = _DOMAPI.dom.getParentElement(el)){
                    if ((0, _Instance.getTabsterOnElement)(tabster, el)?.groupper?.isActive(true)) {
                        return null;
                    }
                }
            } else {
                return null;
            }
        }
        if (!container) {
            return null;
        }
        const focusable = tabster.focusable;
        const moverProps = mover.getProps();
        const direction = moverProps.direction || _Consts.MoverDirections.Both;
        const isBoth = direction === _Consts.MoverDirections.Both;
        const isVertical = isBoth || direction === _Consts.MoverDirections.Vertical;
        const isHorizontal = isBoth || direction === _Consts.MoverDirections.Horizontal;
        const isGridLinear = direction === _Consts.MoverDirections.GridLinear;
        const isGrid = isGridLinear || direction === _Consts.MoverDirections.Grid;
        const isCyclic = moverProps.cyclic;
        let next;
        let scrollIntoViewArg;
        let focusedElementRect;
        let focusedElementX1 = 0;
        let focusedElementX2 = 0;
        if (isGrid) {
            focusedElementRect = fromElement.getBoundingClientRect();
            focusedElementX1 = Math.ceil(focusedElementRect.left);
            focusedElementX2 = Math.floor(focusedElementRect.right);
        }
        if (ctx.rtl) {
            if (key === _Consts.MoverKeys.ArrowRight) {
                key = _Consts.MoverKeys.ArrowLeft;
            } else if (key === _Consts.MoverKeys.ArrowLeft) {
                key = _Consts.MoverKeys.ArrowRight;
            }
        }
        if (key === _Consts.MoverKeys.ArrowDown && isVertical || key === _Consts.MoverKeys.ArrowRight && (isHorizontal || isGrid)) {
            next = focusable.findNext({
                currentElement: fromElement,
                container,
                useActiveModalizer: true
            });
            if (next && isGrid) {
                const nextElementX1 = Math.ceil(next.getBoundingClientRect().left);
                if (!isGridLinear && focusedElementX2 > nextElementX1) {
                    next = undefined;
                }
            } else if (!next && isCyclic) {
                next = focusable.findFirst({
                    container,
                    useActiveModalizer: true
                });
            }
        } else if (key === _Consts.MoverKeys.ArrowUp && isVertical || key === _Consts.MoverKeys.ArrowLeft && (isHorizontal || isGrid)) {
            next = focusable.findPrev({
                currentElement: fromElement,
                container,
                useActiveModalizer: true
            });
            if (next && isGrid) {
                const nextElementX2 = Math.floor(next.getBoundingClientRect().right);
                if (!isGridLinear && nextElementX2 > focusedElementX1) {
                    next = undefined;
                }
            } else if (!next && isCyclic) {
                next = focusable.findLast({
                    container,
                    useActiveModalizer: true
                });
            }
        } else if (key === _Consts.MoverKeys.Home) {
            if (isGrid) {
                focusable.findElement({
                    container,
                    currentElement: fromElement,
                    useActiveModalizer: true,
                    isBackward: true,
                    acceptCondition: (el)=>{
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }
                        const nextElementX1 = Math.ceil(el.getBoundingClientRect().left ?? 0);
                        if (el !== fromElement && focusedElementX1 <= nextElementX1) {
                            return true;
                        }
                        next = el;
                        return false;
                    }
                });
            } else {
                next = focusable.findFirst({
                    container,
                    useActiveModalizer: true
                });
            }
        } else if (key === _Consts.MoverKeys.End) {
            if (isGrid) {
                focusable.findElement({
                    container,
                    currentElement: fromElement,
                    useActiveModalizer: true,
                    acceptCondition: (el)=>{
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }
                        const nextElementX1 = Math.ceil(el.getBoundingClientRect().left ?? 0);
                        if (el !== fromElement && focusedElementX1 >= nextElementX1) {
                            return true;
                        }
                        next = el;
                        return false;
                    }
                });
            } else {
                next = focusable.findLast({
                    container,
                    useActiveModalizer: true
                });
            }
        } else if (key === _Consts.MoverKeys.PageUp) {
            focusable.findElement({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
                isBackward: true,
                acceptCondition: (el)=>{
                    if (!focusable.isFocusable(el)) {
                        return false;
                    }
                    if ((0, _Utils.isElementVerticallyVisibleInContainer)(this._win, el, mover.visibilityTolerance)) {
                        next = el;
                        return false;
                    }
                    return true;
                }
            });
            // will be on the first column move forward and preserve previous column
            if (isGrid && next) {
                const firstColumnX1 = Math.ceil(next.getBoundingClientRect().left);
                focusable.findElement({
                    currentElement: next,
                    container,
                    useActiveModalizer: true,
                    acceptCondition: (el)=>{
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }
                        const nextElementX1 = Math.ceil(el.getBoundingClientRect().left);
                        if (focusedElementX1 < nextElementX1 || firstColumnX1 >= nextElementX1) {
                            return true;
                        }
                        next = el;
                        return false;
                    }
                });
            }
            scrollIntoViewArg = false;
        } else if (key === _Consts.MoverKeys.PageDown) {
            focusable.findElement({
                currentElement: fromElement,
                container,
                useActiveModalizer: true,
                acceptCondition: (el)=>{
                    if (!focusable.isFocusable(el)) {
                        return false;
                    }
                    if ((0, _Utils.isElementVerticallyVisibleInContainer)(this._win, el, mover.visibilityTolerance)) {
                        next = el;
                        return false;
                    }
                    return true;
                }
            });
            // will be on the last column move backwards and preserve previous column
            if (isGrid && next) {
                const lastColumnX1 = Math.ceil(next.getBoundingClientRect().left);
                focusable.findElement({
                    currentElement: next,
                    container,
                    useActiveModalizer: true,
                    isBackward: true,
                    acceptCondition: (el)=>{
                        if (!focusable.isFocusable(el)) {
                            return false;
                        }
                        const nextElementX1 = Math.ceil(el.getBoundingClientRect().left);
                        if (focusedElementX1 > nextElementX1 || lastColumnX1 <= nextElementX1) {
                            return true;
                        }
                        next = el;
                        return false;
                    }
                });
            }
            scrollIntoViewArg = true;
        } else if (isGrid) {
            const isBackward = key === _Consts.MoverKeys.ArrowUp;
            const ax1 = focusedElementX1;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ay1 = Math.ceil(focusedElementRect.top);
            const ax2 = focusedElementX2;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const ay2 = Math.floor(focusedElementRect.bottom);
            let targetElement;
            let lastDistance;
            let lastIntersection = 0;
            focusable.findAll({
                container,
                currentElement: fromElement,
                isBackward,
                onElement: (el)=>{
                    // Find element which has maximal intersection with the focused element horizontally,
                    // or the closest one.
                    const rect = el.getBoundingClientRect();
                    const bx1 = Math.ceil(rect.left);
                    const by1 = Math.ceil(rect.top);
                    const bx2 = Math.floor(rect.right);
                    const by2 = Math.floor(rect.bottom);
                    if (isBackward && ay1 < by2 || !isBackward && ay2 > by1) {
                        // Only consider elements which are below/above curretly focused.
                        return true;
                    }
                    const xIntersectionWidth = Math.ceil(Math.min(ax2, bx2)) - Math.floor(Math.max(ax1, bx1));
                    const minWidth = Math.ceil(Math.min(ax2 - ax1, bx2 - bx1));
                    if (xIntersectionWidth > 0 && minWidth >= xIntersectionWidth) {
                        // Element intersects with the focused element on X axis.
                        const intersection = xIntersectionWidth / minWidth;
                        if (intersection > lastIntersection) {
                            targetElement = el;
                            lastIntersection = intersection;
                        }
                    } else if (lastIntersection === 0) {
                        // If we didn't have intersection, try just the closest one.
                        const distance = getDistance(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2);
                        if (lastDistance === undefined || distance < lastDistance) {
                            lastDistance = distance;
                            targetElement = el;
                        }
                    } else if (lastIntersection > 0) {
                        // Element doesn't intersect, but we had intersection already, stop search.
                        return false;
                    }
                    return true;
                }
            });
            next = targetElement;
        }
        if (next && (!relatedEvent || relatedEvent && container.dispatchEvent(new _Events.TabsterMoveFocusEvent({
            by: "mover",
            owner: container,
            next,
            relatedEvent
        })))) {
            if (scrollIntoViewArg !== undefined) {
                (0, _Utils.scrollIntoView)(this._win, next, scrollIntoViewArg);
            }
            if (relatedEvent) {
                relatedEvent.preventDefault();
                relatedEvent.stopImmediatePropagation();
            }
            (0, _keyborg.nativeFocus)(next);
            return next;
        }
        return null;
    }
    _onKeyDown = async (event)=>{
        if (this._ignoredInputTimer) {
            this._win().clearTimeout(this._ignoredInputTimer);
            delete this._ignoredInputTimer;
        }
        this._ignoredInputResolve?.(false);
        // Give a chance to other listeners to handle the event (for example,
        // to scroll instead of moving focus).
        if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
            return;
        }
        const key = event.key;
        let moverKey;
        if (key === _Keys.Keys.ArrowDown) {
            moverKey = _Consts.MoverKeys.ArrowDown;
        } else if (key === _Keys.Keys.ArrowRight) {
            moverKey = _Consts.MoverKeys.ArrowRight;
        } else if (key === _Keys.Keys.ArrowUp) {
            moverKey = _Consts.MoverKeys.ArrowUp;
        } else if (key === _Keys.Keys.ArrowLeft) {
            moverKey = _Consts.MoverKeys.ArrowLeft;
        } else if (key === _Keys.Keys.PageDown) {
            moverKey = _Consts.MoverKeys.PageDown;
        } else if (key === _Keys.Keys.PageUp) {
            moverKey = _Consts.MoverKeys.PageUp;
        } else if (key === _Keys.Keys.Home) {
            moverKey = _Consts.MoverKeys.Home;
        } else if (key === _Keys.Keys.End) {
            moverKey = _Consts.MoverKeys.End;
        }
        if (!moverKey) {
            return;
        }
        const focused = this._tabster.focusedElement.getFocusedElement();
        if (!focused || await this._isIgnoredInput(focused, key)) {
            return;
        }
        this._moveFocus(focused, moverKey, event);
    };
    _onMoveFocus = (e)=>{
        const element = e.composedPath()[0];
        const key = e.detail?.key;
        if (element && key !== undefined && !e.defaultPrevented) {
            this._moveFocus(element, key);
            e.stopImmediatePropagation();
        }
    };
    _onMemorizedElement = (e)=>{
        const target = e.composedPath()[0];
        let memorizedElement = e.detail?.memorizedElement;
        if (target) {
            const ctx = _Root.RootAPI.getTabsterContext(this._tabster, target);
            const mover = ctx?.mover;
            if (mover) {
                if (memorizedElement && !_DOMAPI.dom.nodeContains(mover.getElement(), memorizedElement)) {
                    memorizedElement = undefined;
                }
                mover.setCurrent(memorizedElement);
                e.stopImmediatePropagation();
            }
        }
    };
    async _isIgnoredInput(element, key) {
        if (element.getAttribute("aria-expanded") === "true" && (element.hasAttribute("aria-activedescendant") || element.getAttribute("role") === "combobox")) {
            // It is likely a combobox with expanded options and arrow keys are
            // controlled by it.
            return true;
        }
        if ((0, _Utils.matchesSelector)(element, _inputSelector)) {
            let selectionStart = 0;
            let selectionEnd = 0;
            let textLength = 0;
            let asyncRet;
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
                const type = element.type;
                const value = element.value;
                textLength = (value || "").length;
                if (type === "email" || type === "number") {
                    // For these types Chromium doesn't provide selectionStart and selectionEnd.
                    // Hence the ugly workaround to find if the caret position is changed with
                    // the keypress.
                    // TODO: Have a look at range, week, time, time, date, datetime-local.
                    if (textLength) {
                        const selection = _DOMAPI.dom.getSelection(element);
                        if (selection) {
                            const initialLength = selection.toString().length;
                            const isBackward = key === _Keys.Keys.ArrowLeft || key === _Keys.Keys.ArrowUp;
                            selection.modify("extend", isBackward ? "backward" : "forward", "character");
                            if (initialLength !== selection.toString().length) {
                                // The caret is moved, so, we're not on the edge of the value.
                                // Restore original selection.
                                selection.modify("extend", isBackward ? "forward" : "backward", "character");
                                return true;
                            } else {
                                textLength = 0;
                            }
                        }
                    }
                } else {
                    const selStart = element.selectionStart;
                    if (selStart === null) {
                        // Do not ignore not text editable inputs like checkboxes and radios (but ignore hidden).
                        return type === "hidden";
                    }
                    selectionStart = selStart || 0;
                    selectionEnd = element.selectionEnd || 0;
                }
            } else if (element.contentEditable === "true") {
                asyncRet = new Promise((resolve)=>{
                    this._ignoredInputResolve = (value)=>{
                        delete this._ignoredInputResolve;
                        resolve(value);
                    };
                    const win = this._win();
                    if (this._ignoredInputTimer) {
                        win.clearTimeout(this._ignoredInputTimer);
                    }
                    const { anchorNode: prevAnchorNode, focusNode: prevFocusNode, anchorOffset: prevAnchorOffset, focusOffset: prevFocusOffset } = _DOMAPI.dom.getSelection(element) || {};
                    // Get selection gives incorrect value if we call it syncronously onKeyDown.
                    this._ignoredInputTimer = win.setTimeout(()=>{
                        delete this._ignoredInputTimer;
                        const { anchorNode, focusNode, anchorOffset, focusOffset } = _DOMAPI.dom.getSelection(element) || {};
                        if (anchorNode !== prevAnchorNode || focusNode !== prevFocusNode || anchorOffset !== prevAnchorOffset || focusOffset !== prevFocusOffset) {
                            this._ignoredInputResolve?.(false);
                            return;
                        }
                        selectionStart = anchorOffset || 0;
                        selectionEnd = focusOffset || 0;
                        textLength = element.textContent?.length || 0;
                        if (anchorNode && focusNode) {
                            if (_DOMAPI.dom.nodeContains(element, anchorNode) && _DOMAPI.dom.nodeContains(element, focusNode)) {
                                if (anchorNode !== element) {
                                    let anchorFound = false;
                                    const addOffsets = (node)=>{
                                        if (node === anchorNode) {
                                            anchorFound = true;
                                        } else if (node === focusNode) {
                                            return true;
                                        }
                                        const nodeText = node.textContent;
                                        if (nodeText && !_DOMAPI.dom.getFirstChild(node)) {
                                            const len = nodeText.length;
                                            if (anchorFound) {
                                                if (focusNode !== anchorNode) {
                                                    selectionEnd += len;
                                                }
                                            } else {
                                                selectionStart += len;
                                                selectionEnd += len;
                                            }
                                        }
                                        let stop = false;
                                        for(let e = _DOMAPI.dom.getFirstChild(node); e && !stop; e = e.nextSibling){
                                            stop = addOffsets(e);
                                        }
                                        return stop;
                                    };
                                    addOffsets(element);
                                }
                            }
                        }
                        this._ignoredInputResolve?.(true);
                    }, 0);
                });
            }
            if (asyncRet && !await asyncRet) {
                return true;
            }
            if (selectionStart !== selectionEnd) {
                return true;
            }
            if (selectionStart > 0 && (key === _Keys.Keys.ArrowLeft || key === _Keys.Keys.ArrowUp || key === _Keys.Keys.Home)) {
                return true;
            }
            if (selectionStart < textLength && (key === _Keys.Keys.ArrowRight || key === _Keys.Keys.ArrowDown || key === _Keys.Keys.End)) {
                return true;
            }
        }
        return false;
    }
} //# sourceMappingURL=Mover.js.map
