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
    get createTabster () {
        return createTabster;
    },
    get disposeTabster () {
        return disposeTabster;
    },
    get forceCleanup () {
        return forceCleanup;
    },
    get getCrossOrigin () {
        return _getCrossOrigin.getCrossOrigin;
    },
    get getCurrentTabster () {
        return getCurrentTabster;
    },
    get getDeloser () {
        return _getDeloser.getDeloser;
    },
    get getGroupper () {
        return _getGroupper.getGroupper;
    },
    get getInternal () {
        return getInternal;
    },
    get getModalizer () {
        return _getModalizer.getModalizer;
    },
    get getMover () {
        return _getMover.getMover;
    },
    get getObservedElement () {
        return _getObservedElement.getObservedElement;
    },
    get getOutline () {
        return _getOutline.getOutline;
    },
    get getRestorer () {
        return _getRestorer.getRestorer;
    },
    get getShadowDOMAPI () {
        return getShadowDOMAPI;
    },
    get getTabster () {
        return getTabster;
    },
    get isNoOp () {
        return isNoOp;
    },
    get makeNoOp () {
        return makeNoOp;
    }
});
const _Focusable = require("./Focusable.cjs");
const _FocusedElement = require("./State/FocusedElement.cjs");
const _Instance = require("./Instance.cjs");
const _KeyboardNavigation = require("./State/KeyboardNavigation.cjs");
const _MutationEvent = require("./MutationEvent.cjs");
const _Root = require("./Root.cjs");
const _Consts = require("./Consts.cjs");
const _Uncontrolled = require("./Uncontrolled.cjs");
const _DummyInput = require("./DummyInput.cjs");
const _Utils = require("./Utils.cjs");
const _DOMAPI = require("./DOMAPI.cjs");
const _index = /*#__PURE__*/ _interop_require_wildcard(require("./Shadowdomize/index.cjs"));
const _getCrossOrigin = require("./get/getCrossOrigin.cjs");
const _getDeloser = require("./get/getDeloser.cjs");
const _getGroupper = require("./get/getGroupper.cjs");
const _getModalizer = require("./get/getModalizer.cjs");
const _getMover = require("./get/getMover.cjs");
const _getObservedElement = require("./get/getObservedElement.cjs");
const _getOutline = require("./get/getOutline.cjs");
const _getRestorer = require("./get/getRestorer.cjs");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
class Tabster {
    keyboardNavigation;
    focusedElement;
    focusable;
    root;
    uncontrolled;
    core;
    constructor(tabster){
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
 */ class TabsterCore {
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
    constructor(win, props){
        this._storage = new WeakMap();
        this._win = win;
        const getWindow = this.getWindow;
        if (props?.DOMAPI) {
            (0, _DOMAPI.setDOMAPI)({
                ...props.DOMAPI
            });
        }
        this.keyboardNavigation = new _KeyboardNavigation.KeyboardNavigationState(getWindow);
        this.focusedElement = new _FocusedElement.FocusedElementState(this, getWindow);
        this.focusable = new _Focusable.FocusableAPI(this);
        this.root = new _Root.RootAPI(this, props?.autoRoot);
        this.uncontrolled = new _Uncontrolled.UncontrolledAPI(// TODO: Remove checkUncontrolledTrappingFocus in the next major version.
        props?.checkUncontrolledCompletely || props?.checkUncontrolledTrappingFocus);
        this.controlTab = props?.controlTab ?? true;
        this.rootDummyInputs = !!props?.rootDummyInputs;
        this._dummyObserver = new _DummyInput.DummyInputObserver(getWindow);
        this.getParent = props?.getParent ?? _DOMAPI.dom.getParentNode;
        this.internal = {
            stopObserver: ()=>{
                if (this._unobserve) {
                    this._unobserve();
                    delete this._unobserve;
                }
            },
            resumeObserver: (syncState)=>{
                if (!this._unobserve) {
                    const doc = getWindow().document;
                    this._unobserve = (0, _MutationEvent.observeMutations)(doc, this, _Instance.updateTabsterByAttribute, syncState);
                }
            }
        };
        // Gives a tick to the host app to initialize other tabster
        // APIs before tabster starts observing attributes.
        this.queueInit(()=>{
            this.internal.resumeObserver(true);
        });
    }
    /**
     * Merges external props with the current props. Not all
     * props can/should be mergeable, so let's add more as we move on.
     * @param props Tabster props
     */ _mergeProps(props) {
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
        } else {
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
        (0, _Utils.clearElementCache)(this.getWindow);
        this._storage = new WeakMap();
        this._wrappers.clear();
        if (win) {
            (0, _Utils.disposeInstanceContext)(win);
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
        } else if (addremove === true) {
            entry = {};
            storage.set(element, entry);
        }
        return entry;
    }
    getWindow = ()=>{
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
        this._forgetMemorizedTimer = this._win.setTimeout(()=>{
            delete this._forgetMemorizedTimer;
            for(let el = this._forgetMemorizedElements.shift(); el; el = this._forgetMemorizedElements.shift()){
                (0, _Utils.clearElementCache)(this.getWindow, el);
                _FocusedElement.FocusedElementState.forgetMemorized(this.focusedElement, el);
            }
        }, 0);
    }
    queueInit(callback) {
        if (!this._win) {
            return;
        }
        this._initQueue.push(callback);
        if (!this._initTimer) {
            this._initTimer = this._win?.setTimeout(()=>{
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
        queue.forEach((callback)=>callback());
    }
}
function forceCleanup(tabster) {
    // The only legit case for calling this method is when you've completely removed
    // the application DOM and not going to add the new one for a while.
    const tabsterCore = tabster.core;
    tabsterCore.forceCleanup();
}
function createTabster(win, props) {
    let tabster = getCurrentTabster(win);
    if (tabster) {
        return tabster.createTabster(false, props);
    }
    tabster = new TabsterCore(win, props);
    win.__tabsterInstance = tabster;
    return tabster.createTabster();
}
function getTabster(win) {
    const tabster = getCurrentTabster(win);
    return tabster ? tabster.createTabster(true) : null;
}
function getShadowDOMAPI() {
    return _index;
}
function getInternal(tabster) {
    const tabsterCore = tabster.core;
    return tabsterCore.internal;
}
function disposeTabster(tabster, allInstances) {
    tabster.core.disposeTabster(tabster, allInstances);
}
function getCurrentTabster(win) {
    return win.__tabsterInstance;
}
function makeNoOp(tabster, noop) {
    const core = tabster.core;
    if (core._noop !== noop) {
        core._noop = noop;
        const processNode = (node)=>{
            const element = node;
            if (!element.getAttribute) {
                return NodeFilter.FILTER_SKIP;
            }
            if ((0, _Instance.getTabsterOnElement)(core, element) || element.hasAttribute(_Consts.TABSTER_ATTRIBUTE_NAME)) {
                (0, _Instance.updateTabsterByAttribute)(core, element);
            }
            return NodeFilter.FILTER_SKIP;
        };
        const doc = core.getWindow().document;
        const body = doc.body;
        processNode(body);
        const walker = (0, _Utils.createElementTreeWalker)(doc, body, processNode);
        if (walker) {
            while(walker.nextNode()){
            /* Iterating for the sake of calling processNode() callback. */ }
        }
    }
}
function isNoOp(tabster) {
    return tabster._noop;
}
 //# sourceMappingURL=Tabster.js.map
