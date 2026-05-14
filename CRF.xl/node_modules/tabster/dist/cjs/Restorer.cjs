/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RestorerAPI", {
    enumerable: true,
    get: function() {
        return RestorerAPI;
    }
});
const _Instance = require("./Instance.cjs");
const _Consts = require("./Consts.cjs");
const _Events = require("./Events.cjs");
const _Utils = require("./Utils.cjs");
const _DOMAPI = require("./DOMAPI.cjs");
class Restorer extends _Utils.TabsterPart {
    _hasFocus = false;
    constructor(tabster, element, props){
        super(tabster, element, props);
        if (this._props.type === _Consts.RestorerTypes.Source) {
            const element = this._element?.get();
            element?.addEventListener("focusout", this._onFocusOut);
            element?.addEventListener("focusin", this._onFocusIn);
            // set hasFocus when the instance is created, in case focus has already moved within it
            this._hasFocus = _DOMAPI.dom.nodeContains(element, element && _DOMAPI.dom.getActiveElement(element.ownerDocument));
        }
    }
    dispose() {
        if (this._props.type === _Consts.RestorerTypes.Source) {
            const element = this._element?.get();
            element?.removeEventListener("focusout", this._onFocusOut);
            element?.removeEventListener("focusin", this._onFocusIn);
            if (this._hasFocus) {
                const doc = this._tabster.getWindow().document;
                doc.body.dispatchEvent(new _Events.RestorerRestoreFocusEvent());
            }
        }
    }
    _onFocusOut = (e)=>{
        const element = this._element?.get();
        if (element && e.relatedTarget === null) {
            element.dispatchEvent(new _Events.RestorerRestoreFocusEvent());
        }
        if (element && !_DOMAPI.dom.nodeContains(element, e.relatedTarget)) {
            this._hasFocus = false;
        }
    };
    _onFocusIn = ()=>{
        this._hasFocus = true;
    };
}
class History {
    static DEPTH = 10;
    _stack = [];
    _getWindow;
    constructor(getWindow){
        this._getWindow = getWindow;
    }
    /**
     * Push a weak element to the top of the history stack.
     * If the stack is full, the bottom weak element is removed.
     * If the element is already at the top of the stack, it is not duplicated.
     */ push(element) {
        // Don't duplicate the top of history
        if (this._stack[this._stack.length - 1]?.get() === element) {
            return;
        }
        if (this._stack.length > History.DEPTH) {
            this._stack.shift();
        }
        this._stack.push(new _Utils.WeakHTMLElement(element));
    }
    /**
     * Pop the first element from the history that satisfies the callback.
     * The history is searched from the top to the bottom (from the most recent to the least recent).
     *
     * If a weak reference to the element is broken,
     * or the element is no longer in the DOM,
     * the element is removed from the top of the stack while popping.
     *
     * If no matching element is found, undefined is returned.
     * If the stack is empty, undefined is returned.
     */ pop(filter = ()=>true) {
        const doc = this._getWindow().document;
        for(let index = this._stack.length - 1; index >= 0; index--){
            const maybeElement = this._stack.pop()?.get();
            if (maybeElement && _DOMAPI.dom.nodeContains(doc.body, _DOMAPI.dom.getParentElement(maybeElement)) && filter(maybeElement)) {
                return maybeElement;
            }
        }
        return undefined;
    }
}
class RestorerAPI {
    _tabster;
    _history;
    _keyboardNavState;
    _focusedElementState;
    _getWindow;
    constructor(tabster){
        this._tabster = tabster;
        this._getWindow = tabster.getWindow;
        this._getWindow().addEventListener(_Events.RestorerRestoreFocusEventName, this._onRestoreFocus);
        this._history = new History(this._getWindow);
        this._keyboardNavState = tabster.keyboardNavigation;
        this._focusedElementState = tabster.focusedElement;
        this._focusedElementState.subscribe(this._onFocusIn);
    }
    dispose() {
        const win = this._getWindow();
        this._focusedElementState.unsubscribe(this._onFocusIn);
        this._focusedElementState.cancelAsyncFocus(_Consts.AsyncFocusSources.Restorer);
        win.removeEventListener(_Events.RestorerRestoreFocusEventName, this._onRestoreFocus);
    }
    _onRestoreFocus = (e)=>{
        this._focusedElementState.cancelAsyncFocus(_Consts.AsyncFocusSources.Restorer);
        // ShadowDOM will have shadowRoot as e.target.
        const source = e.composedPath()[0];
        if (source) {
            // source id must be recovered before source is removed from DOM
            // otherwise it'll be unreachable
            // (as tabster on element will not be available through getTabsterOnElement)
            const sourceId = (0, _Instance.getTabsterOnElement)(this._tabster, source)?.restorer?.getProps().id;
            this._focusedElementState.requestAsyncFocus(_Consts.AsyncFocusSources.Restorer, ()=>this._restoreFocus(source, sourceId), 0);
        }
    };
    _onFocusIn = (element)=>{
        if (!element) {
            return;
        }
        const tabsterAttribute = (0, _Instance.getTabsterOnElement)(this._tabster, element);
        if (tabsterAttribute?.restorer?.getProps().type !== _Consts.RestorerTypes.Target) {
            return;
        }
        this._history.push(element);
    };
    _restoreFocus = (source, sourceId)=>{
        // don't restore focus if focus isn't lost to body
        const doc = this._getWindow().document;
        if (_DOMAPI.dom.getActiveElement(doc) !== doc.body) {
            return;
        }
        if (// clicking on any empty space focuses body - this is can be a false positive
        !this._keyboardNavState.isNavigatingWithKeyboard() && // Source no longer exists on DOM - always restore focus
        _DOMAPI.dom.nodeContains(doc.body, source)) {
            return;
        }
        const getId = (element)=>{
            const restorerProps = (0, _Instance.getTabsterOnElement)(this._tabster, element)?.restorer?.getProps();
            // We return id or undefined if there is actual restorer on the element,
            // and null otherwise. To filter out elements that had restorers in their lifetime
            // but don't have them anymore.
            return restorerProps ? restorerProps.id : null;
        };
        // sourceId is undefined or string, if there is no Restorer on the target, the element will
        // be filtered out because getId() will return null.
        this._history.pop((target)=>sourceId === getId(target))?.focus();
    };
    createRestorer(element, props) {
        const restorer = new Restorer(this._tabster, element, props);
        // Focus might already be on a restorer target when it gets created so the focusin will not do anything
        if (props.type === _Consts.RestorerTypes.Target && _DOMAPI.dom.getActiveElement(element.ownerDocument) === element) {
            this._history.push(element);
        }
        return restorer;
    }
} //# sourceMappingURL=Restorer.js.map
