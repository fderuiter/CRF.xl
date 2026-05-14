//#region src/dom.mts
/*!
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
const addEventListener = (target, type, handler) => {
	target.addEventListener(type, handler, true);
};
const removeEventListener = (target, type, handler) => {
	target.removeEventListener(type, handler, true);
};

//#endregion
//#region src/FocusEvent.mts
/*!
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
const KEYBORG_FOCUSIN = "keyborg:focusin";
const KEYBORG_FOCUSOUT = "keyborg:focusout";
const FOCUS_IN_HANDLER = 0;
const FOCUS_OUT_HANDLER = 1;
const SHADOW_TARGETS = 2;
const LAST_FOCUSED_PROGRAMMATICALLY = 3;
function canOverrideNativeFocus(win) {
	const HTMLElement = win.HTMLElement;
	const origFocus = HTMLElement.prototype.focus;
	let isCustomFocusCalled = false;
	HTMLElement.prototype.focus = function focus() {
		isCustomFocusCalled = true;
	};
	win.document.createElement("button").focus();
	HTMLElement.prototype.focus = origFocus;
	return isCustomFocusCalled;
}
let _canOverrideNativeFocus = false;
/**
* Guarantees that the native `focus` will be used
*/
function nativeFocus(element) {
	const focus = element.focus;
	if (focus.__keyborgNativeFocus) focus.__keyborgNativeFocus.call(element);
	else element.focus();
}
/**
* Overrides the native `focus` and setups the keyborg focus event
*/
function setupFocusEvent(win) {
	const kwin = win;
	const doc = kwin.document;
	const proto = kwin.HTMLElement.prototype;
	if (!_canOverrideNativeFocus) _canOverrideNativeFocus = canOverrideNativeFocus(kwin);
	const origFocus = proto.focus;
	if (origFocus.__keyborgNativeFocus) return;
	proto.focus = focus;
	const shadowTargets = /* @__PURE__ */ new Set();
	const focusOutHandler = (e) => {
		const target = e.target;
		if (!target) return;
		const event = new CustomEvent(KEYBORG_FOCUSOUT, {
			cancelable: true,
			bubbles: true,
			composed: true,
			detail: { originalEvent: e }
		});
		target.dispatchEvent(event);
	};
	const focusInHandler = (e) => {
		const target = e.target;
		if (!target) return;
		let node = e.composedPath()[0];
		const currentShadows = /* @__PURE__ */ new Set();
		while (node) if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
			currentShadows.add(node);
			node = node.host;
		} else node = node.parentNode;
		for (const shadowRootWeakRef of shadowTargets) {
			const shadowRoot = shadowRootWeakRef.deref();
			if (!shadowRoot || !currentShadows.has(shadowRoot)) {
				shadowTargets.delete(shadowRootWeakRef);
				if (shadowRoot) {
					removeEventListener(shadowRoot, "focusin", focusInHandler);
					removeEventListener(shadowRoot, "focusout", focusOutHandler);
				}
			}
		}
		onFocusIn(target, e.relatedTarget || void 0);
	};
	const onFocusIn = (target, relatedTarget, originalEvent) => {
		const shadowRoot = target.shadowRoot;
		if (shadowRoot) {
			/**
			* https://bugs.chromium.org/p/chromium/issues/detail?id=1512028
			* focusin events don't bubble up through an open shadow root once focus is inside
			* once focus moves into a shadow root - we drop the same focusin handler there
			* keyborg's custom event will still bubble up since it is composed
			* event handlers should be cleaned up once focus leaves the shadow root.
			*
			* When a focusin event is dispatched from a shadow root, its target is the shadow root parent.
			* Each shadow root encounter requires a new capture listener.
			* Why capture? - we want to follow the focus event in order or descending nested shadow roots
			* When there are no more shadow root targets - dispatch the keyborg:focusin event
			*
			* 1. no focus event
			* > document - capture listener ✅
			*   > shadow root 1
			*     > shadow root 2
			*       > shadow root 3
			*         > focused element
			*
			* 2. focus event received by document listener
			* > document - capture listener ✅ (focus event here)
			*   > shadow root 1 - capture listener ✅
			*     > shadow root 2
			*       > shadow root 3
			*         > focused element
			*
			* 3. focus event received by root l1 listener
			* > document - capture listener ✅
			*   > shadow root 1 - capture listener ✅ (focus event here)
			*     > shadow root 2 - capture listener ✅
			*       > shadow root 3
			*         > focused element
			*
			* 4. focus event received by root l2 listener
			* > document - capture listener ✅
			*   > shadow root 1 - capture listener ✅
			*     > shadow root 2 - capture listener ✅ (focus event here)
			*       > shadow root 3 - capture listener ✅
			*         > focused element
			*
			* 5. focus event received by root l3 listener, no more shadow root targets
			* > document - capture listener ✅
			*   > shadow root 1 - capture listener ✅
			*     > shadow root 2 - capture listener ✅
			*       > shadow root 3 - capture listener ✅ (focus event here)
			*         > focused element ✅ (no shadow root - dispatch keyborg event)
			*/
			for (const shadowRootWeakRef of shadowTargets) if (shadowRootWeakRef.deref() === shadowRoot) return;
			addEventListener(shadowRoot, "focusin", focusInHandler);
			addEventListener(shadowRoot, "focusout", focusOutHandler);
			shadowTargets.add(new WeakRef(shadowRoot));
			return;
		}
		const details = {
			relatedTarget,
			originalEvent
		};
		const event = new CustomEvent(KEYBORG_FOCUSIN, {
			cancelable: true,
			bubbles: true,
			composed: true,
			detail: details
		});
		event.details = details;
		if (_canOverrideNativeFocus || data[LAST_FOCUSED_PROGRAMMATICALLY]) {
			details.isFocusedProgrammatically = target === data[LAST_FOCUSED_PROGRAMMATICALLY]?.deref();
			data[LAST_FOCUSED_PROGRAMMATICALLY] = void 0;
		}
		target.dispatchEvent(event);
	};
	const data = [
		focusInHandler,
		focusOutHandler,
		shadowTargets
	];
	kwin.__keyborgData = data;
	addEventListener(doc, "focusin", focusInHandler);
	addEventListener(doc, "focusout", focusOutHandler);
	function focus() {
		const d = kwin.__keyborgData;
		if (d) d[LAST_FOCUSED_PROGRAMMATICALLY] = new WeakRef(this);
		return origFocus.apply(this, arguments);
	}
	let activeElement = doc.activeElement;
	while (activeElement && activeElement.shadowRoot) {
		onFocusIn(activeElement);
		activeElement = activeElement.shadowRoot.activeElement;
	}
	focus.__keyborgNativeFocus = origFocus;
}
/**
* Removes keyborg event listeners and custom focus override
* @param win The window that stores keyborg focus events
*/
function disposeFocusEvent(win) {
	const kwin = win;
	const proto = kwin.HTMLElement.prototype;
	const origFocus = proto.focus.__keyborgNativeFocus;
	const data = kwin.__keyborgData;
	if (data) {
		const doc = kwin.document;
		removeEventListener(doc, "focusin", data[FOCUS_IN_HANDLER]);
		removeEventListener(doc, "focusout", data[FOCUS_OUT_HANDLER]);
		for (const shadowRootWeakRef of data[SHADOW_TARGETS]) {
			const shadowRoot = shadowRootWeakRef.deref();
			if (shadowRoot) {
				removeEventListener(shadowRoot, "focusin", data[FOCUS_IN_HANDLER]);
				removeEventListener(shadowRoot, "focusout", data[FOCUS_OUT_HANDLER]);
			}
		}
		data[SHADOW_TARGETS].clear();
		delete kwin.__keyborgData;
	}
	if (origFocus) proto.focus = origFocus;
}
/**
* @param win The window that stores keyborg focus events
* @returns The last element focused with element.focus()
*/
function getLastFocusedProgrammatically(win) {
	const data = win.__keyborgData;
	return data ? data[LAST_FOCUSED_PROGRAMMATICALLY]?.deref() || null : void 0;
}

//#endregion
//#region src/Keyborg.mts
/*!
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License.
*/
const _dismissTimeout = 500;
let _lastId = 0;
function createKeyborgCore(targetWindow, props) {
	let currentTargetWindow = targetWindow;
	let isNavigating = false;
	let isMouseOrTouchUsedTimer;
	let dismissTimer;
	let triggerKeys;
	let dismissKeys;
	if (props) {
		if (props.triggerKeys?.length) triggerKeys = new Set(props.triggerKeys);
		if (props.dismissKeys?.length) dismissKeys = new Set(props.dismissKeys);
	}
	const broadcast = () => {
		const refs = currentTargetWindow?.__keyborg?.refs;
		if (refs) for (const id of Object.keys(refs)) refs[id]._cb.forEach((cb) => cb(isNavigating));
	};
	const setNavigating = (val) => {
		if (isNavigating !== val) {
			isNavigating = val;
			broadcast();
		}
	};
	const shouldTrigger = (e) => {
		if (e.key === "Tab") return true;
		const active = currentTargetWindow?.document.activeElement;
		const isTriggerKey = !triggerKeys || triggerKeys.has(e.keyCode);
		const isEditable = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
		return isTriggerKey && !isEditable;
	};
	const shouldDismiss = (e) => {
		return !!dismissKeys?.has(e.keyCode);
	};
	const scheduleDismiss = () => {
		const targetWindow = currentTargetWindow;
		if (!targetWindow) return;
		if (dismissTimer) {
			targetWindow.clearTimeout(dismissTimer);
			dismissTimer = void 0;
		}
		const previousActiveElement = targetWindow.document.activeElement;
		dismissTimer = targetWindow.setTimeout(() => {
			dismissTimer = void 0;
			const currentActiveElement = targetWindow.document.activeElement;
			if (previousActiveElement && currentActiveElement && previousActiveElement === currentActiveElement) setNavigating(false);
		}, _dismissTimeout);
	};
	const onFocusIn = (e) => {
		if (isMouseOrTouchUsedTimer) return;
		if (isNavigating) return;
		const details = e.detail;
		if (!details.relatedTarget) return;
		if (details.isFocusedProgrammatically || details.isFocusedProgrammatically === void 0) return;
		setNavigating(true);
	};
	const onMouseOrTouch = () => {
		if (currentTargetWindow) {
			if (isMouseOrTouchUsedTimer) currentTargetWindow.clearTimeout(isMouseOrTouchUsedTimer);
			isMouseOrTouchUsedTimer = currentTargetWindow.setTimeout(() => {
				isMouseOrTouchUsedTimer = void 0;
			}, 1e3);
		}
		setNavigating(false);
	};
	const onMouseDown = (e) => {
		if (e.buttons === 0 || e.clientX === 0 && e.clientY === 0 && e.screenX === 0 && e.screenY === 0) return;
		onMouseOrTouch();
	};
	const onKeyDown = (e) => {
		if (isNavigating) {
			if (shouldDismiss(e)) scheduleDismiss();
		} else if (shouldTrigger(e)) setNavigating(true);
	};
	const targetDocument = targetWindow.document;
	addEventListener(targetDocument, KEYBORG_FOCUSIN, onFocusIn);
	addEventListener(targetDocument, "mousedown", onMouseDown);
	addEventListener(targetWindow, "keydown", onKeyDown);
	addEventListener(targetDocument, "touchstart", onMouseOrTouch);
	addEventListener(targetDocument, "touchend", onMouseOrTouch);
	addEventListener(targetDocument, "touchcancel", onMouseOrTouch);
	setupFocusEvent(targetWindow);
	const dispose = () => {
		if (!currentTargetWindow) return;
		if (isMouseOrTouchUsedTimer) {
			currentTargetWindow.clearTimeout(isMouseOrTouchUsedTimer);
			isMouseOrTouchUsedTimer = void 0;
		}
		if (dismissTimer) {
			currentTargetWindow.clearTimeout(dismissTimer);
			dismissTimer = void 0;
		}
		disposeFocusEvent(currentTargetWindow);
		const targetDocument = currentTargetWindow.document;
		removeEventListener(targetDocument, KEYBORG_FOCUSIN, onFocusIn);
		removeEventListener(targetDocument, "mousedown", onMouseDown);
		removeEventListener(currentTargetWindow, "keydown", onKeyDown);
		removeEventListener(targetDocument, "touchstart", onMouseOrTouch);
		removeEventListener(targetDocument, "touchend", onMouseOrTouch);
		removeEventListener(targetDocument, "touchcancel", onMouseOrTouch);
		currentTargetWindow = void 0;
	};
	return {
		dispose,
		get isNavigatingWithKeyboard() {
			return isNavigating;
		},
		set isNavigatingWithKeyboard(val) {
			setNavigating(val);
		}
	};
}
function createKeyborg(win, props) {
	const kwin = win;
	const id = "k" + ++_lastId;
	let localWin = kwin;
	let core;
	const callbacks = [];
	const existing = kwin.__keyborg;
	if (existing) core = existing.core;
	else core = createKeyborgCore(kwin, props);
	const instance = {
		isNavigatingWithKeyboard() {
			return !!core?.isNavigatingWithKeyboard;
		},
		subscribe(callback) {
			callbacks.push(callback);
		},
		unsubscribe(callback) {
			const index = callbacks.indexOf(callback);
			if (index >= 0) callbacks.splice(index, 1);
		},
		setVal(val) {
			if (core) core.isNavigatingWithKeyboard = val;
		},
		_cb: callbacks,
		dispose() {
			const wkb = localWin?.__keyborg;
			if (wkb?.refs[id]) {
				delete wkb.refs[id];
				if (Object.keys(wkb.refs).length === 0) {
					wkb.core.dispose();
					delete localWin.__keyborg;
				}
			} else if (process.env.NODE_ENV !== "production") console.error(`Keyborg instance ${id} is being disposed incorrectly.`);
			callbacks.length = 0;
			core = void 0;
			localWin = void 0;
		}
	};
	if (existing) existing.refs[id] = instance;
	else kwin.__keyborg = {
		core,
		refs: { [id]: instance }
	};
	return instance;
}
function disposeKeyborg(instance) {
	instance.dispose();
}

//#endregion
//#region src/index.mts
const version = "2.14.1";

//#endregion
export { KEYBORG_FOCUSIN, KEYBORG_FOCUSOUT, createKeyborg, disposeKeyborg, getLastFocusedProgrammatically, nativeFocus, version };
//# sourceMappingURL=index.js.map