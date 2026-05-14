/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { KEYBORG_FOCUSIN, KEYBORG_FOCUSOUT, nativeFocus } from "keyborg";
import { getTabsterOnElement, updateTabsterByAttribute } from "./Instance.js";
import { RootFocusEvent, RootBlurEvent } from "./Events.js";
import { DummyInputManager, DummyInputManagerPriorities, } from "./DummyInput.js";
import { getElementUId, TabsterPart } from "./Utils.js";
import { setTabsterAttribute } from "./AttributeHelpers.js";
function _setInformativeStyle(weakElement, remove, id) {
    if ((process.env.NODE_ENV === 'development')) {
        const element = weakElement.get();
        if (element) {
            if (remove) {
                element.style.removeProperty("--tabster-root");
            }
            else {
                element.style.setProperty("--tabster-root", id + ",");
            }
        }
    }
}
class RootDummyManager extends DummyInputManager {
    _tabster;
    _setFocused;
    constructor(tabster, element, setFocused, sys) {
        super(tabster, element, DummyInputManagerPriorities.Root, sys, undefined, true);
        this._setHandlers(this._onDummyInputFocus);
        this._tabster = tabster;
        this._setFocused = setFocused;
    }
    _onDummyInputFocus = (dummyInput) => {
        if (dummyInput.useDefaultAction) {
            // When we've reached the last focusable element, we want to let the browser
            // to move the focus outside of the page. In order to do that we're synchronously
            // calling focus() of the dummy input from the Tab key handler and allowing
            // the default action to move the focus out.
            this._setFocused(false);
        }
        else {
            // The only way a dummy input gets focused is during the keyboard navigation.
            this._tabster.keyboardNavigation.setNavigatingWithKeyboard(true);
            const element = this._element.get();
            if (element) {
                this._setFocused(true);
                const toFocus = this._tabster.focusedElement.getFirstOrLastTabbable(dummyInput.isFirst, { container: element, ignoreAccessibility: true });
                if (toFocus) {
                    nativeFocus(toFocus);
                    return;
                }
            }
            dummyInput.input?.blur();
        }
    };
}
export class Root extends TabsterPart {
    uid;
    _dummyManager;
    _sys;
    _isFocused = false;
    _setFocusedTimer;
    _onDispose;
    constructor(tabster, element, onDispose, props, sys) {
        super(tabster, element, props);
        this._onDispose = onDispose;
        const win = tabster.getWindow;
        this.uid = getElementUId(win, element);
        this._sys = sys;
        if (tabster.controlTab || tabster.rootDummyInputs) {
            this.addDummyInputs();
        }
        const w = win();
        const doc = w.document;
        doc.addEventListener(KEYBORG_FOCUSIN, this._onFocusIn);
        doc.addEventListener(KEYBORG_FOCUSOUT, this._onFocusOut);
        this._add();
    }
    addDummyInputs() {
        if (!this._dummyManager) {
            this._dummyManager = new RootDummyManager(this._tabster, this._element, this._setFocused, this._sys);
        }
    }
    dispose() {
        this._onDispose(this);
        const win = this._tabster.getWindow();
        const doc = win.document;
        doc.removeEventListener(KEYBORG_FOCUSIN, this._onFocusIn);
        doc.removeEventListener(KEYBORG_FOCUSOUT, this._onFocusOut);
        if (this._setFocusedTimer) {
            win.clearTimeout(this._setFocusedTimer);
            delete this._setFocusedTimer;
        }
        this._dummyManager?.dispose();
        this._remove();
    }
    moveOutWithDefaultAction(isBackward, relatedEvent) {
        const dummyManager = this._dummyManager;
        if (dummyManager) {
            dummyManager.moveOutWithDefaultAction(isBackward, relatedEvent);
        }
        else {
            const el = this.getElement();
            if (el) {
                RootDummyManager.moveWithPhantomDummy(this._tabster, el, true, isBackward, relatedEvent);
            }
        }
    }
    _setFocused = (hasFocused) => {
        if (this._setFocusedTimer) {
            this._tabster.getWindow().clearTimeout(this._setFocusedTimer);
            delete this._setFocusedTimer;
        }
        if (this._isFocused === hasFocused) {
            return;
        }
        const element = this._element.get();
        if (element) {
            if (hasFocused) {
                this._isFocused = true;
                this._dummyManager?.setTabbable(false);
                element.dispatchEvent(new RootFocusEvent({ element }));
            }
            else {
                this._setFocusedTimer = this._tabster
                    .getWindow()
                    .setTimeout(() => {
                    delete this._setFocusedTimer;
                    this._isFocused = false;
                    this._dummyManager?.setTabbable(true);
                    element.dispatchEvent(new RootBlurEvent({ element }));
                }, 0);
            }
        }
    };
    _onFocusIn = (event) => {
        const getParent = this._tabster.getParent;
        const rootElement = this._element.get();
        let curElement = event.composedPath()[0];
        do {
            if (curElement === rootElement) {
                this._setFocused(true);
                return;
            }
            curElement =
                curElement && getParent(curElement);
        } while (curElement);
    };
    _onFocusOut = () => {
        this._setFocused(false);
    };
    _add() {
        if ((process.env.NODE_ENV === 'development')) {
            _setInformativeStyle(this._element, false, this.uid);
        }
    }
    _remove() {
        if ((process.env.NODE_ENV === 'development')) {
            _setInformativeStyle(this._element, true);
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function validateRootProps(props) {
    // TODO: Implement validation.
}
export class RootAPI {
    _tabster;
    _win;
    _autoRoot;
    _autoRootWaiting = false;
    _roots = {};
    _forceDummy = false;
    rootById = {};
    constructor(tabster, autoRoot) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._autoRoot = autoRoot;
        tabster.queueInit(() => {
            if (this._autoRoot) {
                this._autoRootCreate();
            }
        });
    }
    _autoRootCreate = () => {
        const doc = this._win().document;
        const body = doc.body;
        if (body) {
            this._autoRootUnwait(doc);
            const props = this._autoRoot;
            if (props) {
                setTabsterAttribute(body, { root: props }, true);
                updateTabsterByAttribute(this._tabster, body);
                return getTabsterOnElement(this._tabster, body)?.root;
            }
        }
        else if (!this._autoRootWaiting) {
            this._autoRootWaiting = true;
            doc.addEventListener("readystatechange", this._autoRootCreate);
        }
        return undefined;
    };
    _autoRootUnwait(doc) {
        doc.removeEventListener("readystatechange", this._autoRootCreate);
        this._autoRootWaiting = false;
    }
    dispose() {
        const win = this._win();
        this._autoRootUnwait(win.document);
        delete this._autoRoot;
        Object.keys(this._roots).forEach((rootId) => {
            if (this._roots[rootId]) {
                this._roots[rootId].dispose();
                delete this._roots[rootId];
            }
        });
        this.rootById = {};
    }
    createRoot(element, props, sys) {
        if ((process.env.NODE_ENV === 'development')) {
            validateRootProps(props);
        }
        const newRoot = new Root(this._tabster, element, this._onRootDispose, props, sys);
        this._roots[newRoot.id] = newRoot;
        if (this._forceDummy) {
            newRoot.addDummyInputs();
        }
        return newRoot;
    }
    addDummyInputs() {
        this._forceDummy = true;
        const roots = this._roots;
        for (const id of Object.keys(roots)) {
            roots[id].addDummyInputs();
        }
    }
    static getRootByUId(getWindow, id) {
        const tabster = getWindow()
            .__tabsterInstance;
        return tabster && tabster.root.rootById[id];
    }
    /**
     * Fetches the tabster context for an element walking up its ancestors
     *
     * @param tabster Tabster instance
     * @param element The element the tabster context should represent
     * @param options Additional options
     * @returns undefined if the element is not a child of a tabster root, otherwise all applicable tabster behaviours and configurations
     */
    static getTabsterContext(tabster, element, options = {}) {
        if (!element.ownerDocument) {
            return undefined;
        }
        const { checkRtl, referenceElement } = options;
        const getParent = tabster.getParent;
        // Normally, the initialization starts on the next tick after the tabster
        // instance creation. However, if the application starts using it before
        // the next tick, we need to make sure the initialization is done.
        tabster.drainInitQueue();
        let root;
        let modalizer;
        let groupper;
        let mover;
        let excludedFromMover = false;
        let groupperBeforeMover;
        let modalizerInGroupper;
        let dirRightToLeft;
        let uncontrolled;
        let curElement = referenceElement || element;
        const ignoreKeydown = {};
        while (curElement && (!root || checkRtl)) {
            const tabsterOnElement = getTabsterOnElement(tabster, curElement);
            if (checkRtl && dirRightToLeft === undefined) {
                const dir = curElement.dir;
                if (dir) {
                    dirRightToLeft = dir.toLowerCase() === "rtl";
                }
            }
            if (!tabsterOnElement) {
                curElement = getParent(curElement);
                continue;
            }
            const tagName = curElement.tagName;
            if ((tabsterOnElement.uncontrolled ||
                tagName === "IFRAME" ||
                tagName === "WEBVIEW") &&
                tabster.focusable.isVisible(curElement)) {
                uncontrolled = curElement;
            }
            if (!mover &&
                tabsterOnElement.focusable?.excludeFromMover &&
                !groupper) {
                excludedFromMover = true;
            }
            const curModalizer = tabsterOnElement.modalizer;
            const curGroupper = tabsterOnElement.groupper;
            const curMover = tabsterOnElement.mover;
            if (!modalizer && curModalizer) {
                modalizer = curModalizer;
            }
            if (!groupper && curGroupper && (!modalizer || curModalizer)) {
                if (modalizer) {
                    // Modalizer dominates the groupper when they are on the same node and the groupper is active.
                    if (!curGroupper.isActive() &&
                        curGroupper.getProps().tabbability &&
                        modalizer.userId !== tabster.modalizer?.activeId) {
                        modalizer = undefined;
                        groupper = curGroupper;
                    }
                    modalizerInGroupper = curGroupper;
                }
                else {
                    groupper = curGroupper;
                }
            }
            if (!mover &&
                curMover &&
                (!modalizer || curModalizer) &&
                (!curGroupper || curElement !== element) &&
                curElement.contains(element) // Mover makes sense only for really inside elements, not for virutal out of the DOM order children.
            ) {
                mover = curMover;
                groupperBeforeMover = !!groupper && groupper !== curGroupper;
            }
            if (tabsterOnElement.root) {
                root = tabsterOnElement.root;
            }
            if (tabsterOnElement.focusable?.ignoreKeydown) {
                Object.assign(ignoreKeydown, tabsterOnElement.focusable.ignoreKeydown);
            }
            curElement = getParent(curElement);
        }
        // No root element could be found, try to get an auto root
        if (!root) {
            const rootAPI = tabster.root;
            const autoRoot = rootAPI._autoRoot;
            if (autoRoot) {
                if (element.ownerDocument?.body) {
                    root = rootAPI._autoRootCreate();
                }
            }
        }
        if (groupper && !mover) {
            groupperBeforeMover = true;
        }
        if ((process.env.NODE_ENV === 'development') && !root) {
            if (modalizer || groupper || mover) {
                console.error("Tabster Root is required for Mover, Groupper and Modalizer to work.");
            }
        }
        const shouldIgnoreKeydown = (event) => !!ignoreKeydown[event.key];
        return root
            ? {
                root,
                modalizer,
                groupper,
                mover,
                groupperBeforeMover,
                modalizerInGroupper,
                rtl: checkRtl ? !!dirRightToLeft : undefined,
                uncontrolled,
                excludedFromMover,
                ignoreKeydown: shouldIgnoreKeydown,
            }
            : undefined;
    }
    static getRoot(tabster, element) {
        const getParent = tabster.getParent;
        for (let el = element; el; el = getParent(el)) {
            const root = getTabsterOnElement(tabster, el)?.root;
            if (root) {
                return root;
            }
        }
        return undefined;
    }
    onRoot(root, removed) {
        if (removed) {
            delete this.rootById[root.uid];
        }
        else {
            this.rootById[root.uid] = root;
        }
    }
    _onRootDispose = (root) => {
        delete this._roots[root.id];
    };
}
//# sourceMappingURL=Root.js.map