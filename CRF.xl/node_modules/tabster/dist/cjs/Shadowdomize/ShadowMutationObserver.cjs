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
    get ShadowMutationObserver () {
        return ShadowMutationObserver;
    },
    get createShadowMutationObserver () {
        return createShadowMutationObserver;
    }
});
const _DOMFunctions = require("./DOMFunctions.cjs");
class ShadowMutationObserver {
    static _shadowObservers = new Set();
    _root;
    _options;
    _callback;
    _observer;
    _subObservers;
    _isObserving = false;
    static _overrideAttachShadow(win) {
        const origAttachShadow = win.Element.prototype.attachShadow;
        if (origAttachShadow.__origAttachShadow) {
            return;
        }
        Element.prototype.attachShadow = function(options) {
            const shadowRoot = origAttachShadow.call(this, options);
            for (const shadowObserver of ShadowMutationObserver._shadowObservers){
                shadowObserver._addSubObserver(shadowRoot);
            }
            return shadowRoot;
        };
        Element.prototype.attachShadow.__origAttachShadow = origAttachShadow;
    }
    constructor(callback){
        this._callback = callback;
        this._observer = new MutationObserver(this._callbackWrapper);
        this._subObservers = new Map();
    }
    _callbackWrapper = (mutations, observer)=>{
        for (const mutation of mutations){
            if (mutation.type === "childList") {
                const removed = mutation.removedNodes;
                const added = mutation.addedNodes;
                for(let i = 0; i < removed.length; i++){
                    this._walkShadows(removed[i], true);
                }
                for(let i = 0; i < added.length; i++){
                    this._walkShadows(added[i]);
                }
            }
        }
        this._callback(mutations, observer);
    };
    _addSubObserver(shadowRoot) {
        if (!this._options || !this._callback || this._subObservers.has(shadowRoot)) {
            return;
        }
        if (this._options.subtree && (0, _DOMFunctions.nodeContains)(this._root, shadowRoot)) {
            const subObserver = new MutationObserver(this._callbackWrapper);
            this._subObservers.set(shadowRoot, subObserver);
            if (this._isObserving) {
                subObserver.observe(shadowRoot, this._options);
            }
            this._walkShadows(shadowRoot);
        }
    }
    disconnect() {
        this._isObserving = false;
        delete this._options;
        ShadowMutationObserver._shadowObservers.delete(this);
        for (const subObserver of this._subObservers.values()){
            subObserver.disconnect();
        }
        this._subObservers.clear();
        this._observer.disconnect();
    }
    observe(target, options) {
        const doc = target.nodeType === Node.DOCUMENT_NODE ? target : target.ownerDocument;
        const win = doc?.defaultView;
        if (!doc || !win) {
            return;
        }
        ShadowMutationObserver._overrideAttachShadow(win);
        ShadowMutationObserver._shadowObservers.add(this);
        this._root = target;
        this._options = options;
        this._isObserving = true;
        this._observer.observe(target, options);
        this._walkShadows(target);
    }
    _walkShadows(target, remove) {
        const doc = target.nodeType === Node.DOCUMENT_NODE ? target : target.ownerDocument;
        if (!doc) {
            return;
        }
        if (target === doc) {
            target = doc.body;
        } else {
            const shadowRoot = target.shadowRoot;
            if (shadowRoot) {
                this._addSubObserver(shadowRoot);
                return;
            }
        }
        const walker = doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node)=>{
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (remove) {
                        const subObserver = this._subObservers.get(node);
                        if (subObserver) {
                            subObserver.disconnect();
                            this._subObservers.delete(node);
                        }
                    } else {
                        const shadowRoot = node.shadowRoot;
                        if (shadowRoot) {
                            this._addSubObserver(shadowRoot);
                        }
                    }
                }
                return NodeFilter.FILTER_SKIP;
            }
        });
        walker.nextNode();
    }
    takeRecords() {
        const records = this._observer.takeRecords();
        for (const subObserver of this._subObservers.values()){
            records.push(...subObserver.takeRecords());
        }
        return records;
    }
}
function createShadowMutationObserver(callback) {
    return new ShadowMutationObserver(callback);
} //# sourceMappingURL=ShadowMutationObserver.js.map
