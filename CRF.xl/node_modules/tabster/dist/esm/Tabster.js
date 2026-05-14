/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { FocusableAPI } from "./Focusable.js";
import { FocusedElementState } from "./State/FocusedElement.js";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import { KeyboardNavigationState } from "./State/KeyboardNavigation.js";
import { observeMutations } from "./MutationEvent.js";
import { RootAPI } from "./Root.js";
import { TABSTER_ATTRIBUTE_NAME } from "./Consts.js";
import { UncontrolledAPI } from "./Uncontrolled.js";
import { DummyInputObserver } from "./DummyInput.js";
import { clearElementCache, createElementTreeWalker, disposeInstanceContext, } from "./Utils.js";
import { dom, setDOMAPI } from "./DOMAPI.js";
import * as shadowDOMAPI from "./Shadowdomize/index.js";
class Tabster {
    keyboardNavigation;
    focusedElement;
    focusable;
    root;
    uncontrolled;
    core;
    constructor(tabster) {
        this.keyboardNavigation = tabster.keyboardNavigation;
        this.focusedElement = tabster.focusedElement;
        this.focusable = tabster.focusable;
        this.root = tabster.root;
        this.uncontrolled = tabster.uncontrolled;
        this.core = tabster;
    }
}
/**
 * Extends Window to include an internal Tabster instance.
 */
class TabsterCore {
    _storage;
    _unobserve;
    _win;
    _forgetMemorizedTimer;
    _forgetMemorizedElements = [];
    _wrappers = new Set();
    _initTimer;
    _initQueue = [];
    _version = "8.8.0";
    _noop = false;
    controlTab;
    rootDummyInputs;
    // Variance gap: per-key handler types are contravariant in their
    // parameters, so a fully-typed Map<K, TabsterAttrHandler<K>> can't unify
    // them. Cast a plain Map to the typed view; the override on `set` keeps
    // registration type-safe per key, while `get` falls back to the Map's
    // value type (the type-erased shape).
    attrHandlers = new Map();
    // Core APIs
    keyboardNavigation;
    focusedElement;
    focusable;
    root;
    uncontrolled;
    internal;
    _dummyObserver;
    // Extended APIs
    groupper;
    mover;
    outline;
    deloser;
    modalizer;
    observedElement;
    crossOrigin;
    restorer;
    getParent;
    constructor(win, props) {
        this._storage = new WeakMap();
        this._win = win;
        const getWindow = this.getWindow;
        if (props?.DOMAPI) {
            setDOMAPI({ ...props.DOMAPI });
        }
        this.keyboardNavigation = new KeyboardNavigationState(getWindow);
        this.focusedElement = new FocusedElementState(this, getWindow);
        this.focusable = new FocusableAPI(this);
        this.root = new RootAPI(this, props?.autoRoot);
        this.uncontrolled = new UncontrolledAPI(
        // TODO: Remove checkUncontrolledTrappingFocus in the next major version.
        props?.checkUncontrolledCompletely ||
            props?.checkUncontrolledTrappingFocus);
        this.controlTab = props?.controlTab ?? true;
        this.rootDummyInputs = !!props?.rootDummyInputs;
        this._dummyObserver = new DummyInputObserver(getWindow);
        this.getParent = props?.getParent ?? dom.getParentNode;
        this.internal = {
            stopObserver: () => {
                if (this._unobserve) {
                    this._unobserve();
                    delete this._unobserve;
                }
            },
            resumeObserver: (syncState) => {
                if (!this._unobserve) {
                    const doc = getWindow().document;
                    this._unobserve = observeMutations(doc, this, updateTabsterByAttribute, syncState);
                }
            },
        };
        // Gives a tick to the host app to initialize other tabster
        // APIs before tabster starts observing attributes.
        this.queueInit(() => {
            this.internal.resumeObserver(true);
        });
    }
    /**
     * Merges external props with the current props. Not all
     * props can/should be mergeable, so let's add more as we move on.
     * @param props Tabster props
     */
    _mergeProps(props) {
        if (!props) {
            return;
        }
        this.getParent = props.getParent ?? this.getParent;
    }
    createTabster(noRefCount, props) {
        const wrapper = new Tabster(this);
        if (!noRefCount) {
            this._wrappers.add(wrapper);
        }
        this._mergeProps(props);
        return wrapper;
    }
    disposeTabster(wrapper, allInstances) {
        if (allInstances) {
            this._wrappers.clear();
        }
        else {
            this._wrappers.delete(wrapper);
        }
        if (this._wrappers.size === 0) {
            this.dispose();
        }
    }
    dispose() {
        this.internal.stopObserver();
        const win = this._win;
        win?.clearTimeout(this._initTimer);
        delete this._initTimer;
        this._initQueue = [];
        this._forgetMemorizedElements = [];
        if (win && this._forgetMemorizedTimer) {
            win.clearTimeout(this._forgetMemorizedTimer);
            delete this._forgetMemorizedTimer;
        }
        this.outline?.dispose();
        this.crossOrigin?.dispose();
        this.deloser?.dispose();
        this.groupper?.dispose();
        this.mover?.dispose();
        this.modalizer?.dispose();
        this.observedElement?.dispose();
        this.restorer?.dispose();
        this.keyboardNavigation.dispose();
        this.focusable.dispose();
        this.focusedElement.dispose();
        this.root.dispose();
        this._dummyObserver.dispose();
        // Drop handler closures — they capture the API instances we just
        // disposed, and any post-dispose updateTabsterByAttribute call would
        // otherwise dispatch to those zombies.
        this.attrHandlers.clear();
        clearElementCache(this.getWindow);
        this._storage = new WeakMap();
        this._wrappers.clear();
        if (win) {
            disposeInstanceContext(win);
            delete win.__tabsterInstance;
            delete this._win;
        }
    }
    storageEntry(element, addremove) {
        const storage = this._storage;
        let entry = storage.get(element);
        if (entry) {
            if (addremove === false && Object.keys(entry).length === 0) {
                storage.delete(element);
            }
        }
        else if (addremove === true) {
            entry = {};
            storage.set(element, entry);
        }
        return entry;
    }
    getWindow = () => {
        if (!this._win) {
            throw new Error("Using disposed Tabster.");
        }
        return this._win;
    };
    forceCleanup() {
        if (!this._win) {
            return;
        }
        this._forgetMemorizedElements.push(this._win.document.body);
        if (this._forgetMemorizedTimer) {
            return;
        }
        this._forgetMemorizedTimer = this._win.setTimeout(() => {
            delete this._forgetMemorizedTimer;
            for (let el = this._forgetMemorizedElements.shift(); el; el = this._forgetMemorizedElements.shift()) {
                clearElementCache(this.getWindow, el);
                FocusedElementState.forgetMemorized(this.focusedElement, el);
            }
        }, 0);
    }
    queueInit(callback) {
        if (!this._win) {
            return;
        }
        this._initQueue.push(callback);
        if (!this._initTimer) {
            this._initTimer = this._win?.setTimeout(() => {
                delete this._initTimer;
                this.drainInitQueue();
            }, 0);
        }
    }
    drainInitQueue() {
        if (!this._win) {
            return;
        }
        const queue = this._initQueue;
        // Resetting the queue before calling the callbacks to avoid recursion.
        this._initQueue = [];
        queue.forEach((callback) => callback());
    }
}
export function forceCleanup(tabster) {
    // The only legit case for calling this method is when you've completely removed
    // the application DOM and not going to add the new one for a while.
    const tabsterCore = tabster.core;
    tabsterCore.forceCleanup();
}
/**
 * Creates an instance of Tabster, returns the current window instance if it already exists.
 */
export function createTabster(win, props) {
    let tabster = getCurrentTabster(win);
    if (tabster) {
        return tabster.createTabster(false, props);
    }
    tabster = new TabsterCore(win, props);
    win.__tabsterInstance = tabster;
    return tabster.createTabster();
}
/**
 * Returns an instance of Tabster if it was created before or null.
 */
export function getTabster(win) {
    const tabster = getCurrentTabster(win);
    return tabster ? tabster.createTabster(true) : null;
}
export function getShadowDOMAPI() {
    return shadowDOMAPI;
}
export function getInternal(tabster) {
    const tabsterCore = tabster.core;
    return tabsterCore.internal;
}
export function disposeTabster(tabster, allInstances) {
    tabster.core.disposeTabster(tabster, allInstances);
}
/**
 * Returns an instance of Tabster if it already exists on the window .
 * @param win window instance that could contain an Tabster instance.
 */
export function getCurrentTabster(win) {
    return win.__tabsterInstance;
}
/**
 * Allows to make Tabster non operational. Intended for performance debugging (and other
 * kinds of debugging), you can switch Tabster off without changing the application code
 * that consumes it.
 * @param tabster a reference created by createTabster().
 * @param noop true if you want to make Tabster noop, false if you want to turn it back.
 */
export function makeNoOp(tabster, noop) {
    const core = tabster.core;
    if (core._noop !== noop) {
        core._noop = noop;
        const processNode = (node) => {
            const element = node;
            if (!element.getAttribute) {
                return NodeFilter.FILTER_SKIP;
            }
            if (getTabsterOnElement(core, element) ||
                element.hasAttribute(TABSTER_ATTRIBUTE_NAME)) {
                updateTabsterByAttribute(core, element);
            }
            return NodeFilter.FILTER_SKIP;
        };
        const doc = core.getWindow().document;
        const body = doc.body;
        processNode(body);
        const walker = createElementTreeWalker(doc, body, processNode);
        if (walker) {
            while (walker.nextNode()) {
                /* Iterating for the sake of calling processNode() callback. */
            }
        }
    }
}
export function isNoOp(tabster) {
    return tabster._noop;
}
export { getCrossOrigin } from "./get/getCrossOrigin.js";
export { getDeloser } from "./get/getDeloser.js";
export { getGroupper } from "./get/getGroupper.js";
export { getModalizer } from "./get/getModalizer.js";
export { getMover } from "./get/getMover.js";
export { getObservedElement } from "./get/getObservedElement.js";
export { getOutline } from "./get/getOutline.js";
export { getRestorer } from "./get/getRestorer.js";
//# sourceMappingURL=Tabster.js.map