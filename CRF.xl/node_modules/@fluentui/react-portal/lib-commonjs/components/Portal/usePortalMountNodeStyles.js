'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    PORTAL_STYLE_ELEMENT_ID: function() {
        return PORTAL_STYLE_ELEMENT_ID;
    },
    getPortalRefCount: function() {
        return getPortalRefCount;
    },
    setPortalRefCount: function() {
        return setPortalRefCount;
    },
    usePortalMountNodeStyles: function() {
        return usePortalMountNodeStyles;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _reactutilities = require("@fluentui/react-utilities");
// String concatenation is used to prevent bundlers to complain with older versions of React
const useInsertionEffect = _react['useInsertion' + 'Effect'] ? _react['useInsertion' + 'Effect'] : _reactutilities.useIsomorphicLayoutEffect;
// Symbol used as a "private" property key on Document to store the active portal reference count.
// Symbol.for() registers in the global Symbol registry so the same key is shared across bundles
// (e.g. when multiple copies of this module are loaded in the same page).
// Storing state directly on the document avoids any WeakMap cross-reference issues and is safe
// across multiple documents (e.g. iframes) because each document object carries its own counter.
const PORTAL_STYLE_REF_COUNT = Symbol.for('fui-portal-style-ref-count');
// Creates new stacking context to prevent z-index issues
// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context
//
// Also keeps a portal on top of a page to prevent scrollbars from appearing
const PORTAL_MOUNT_NODE_STYLE_RULE = `[data-portal-node]{position:absolute;top:0;left:0;right:0;z-index:1000000}`;
const PORTAL_STYLE_ELEMENT_ID = 'fui-portal-styles';
function getPortalRefCount(targetDocument) {
    var _targetDocument_PORTAL_STYLE_REF_COUNT;
    return (_targetDocument_PORTAL_STYLE_REF_COUNT = targetDocument[PORTAL_STYLE_REF_COUNT]) !== null && _targetDocument_PORTAL_STYLE_REF_COUNT !== void 0 ? _targetDocument_PORTAL_STYLE_REF_COUNT : 0;
}
function setPortalRefCount(targetDocument, count) {
    targetDocument[PORTAL_STYLE_REF_COUNT] = count;
}
function injectPortalMountNodeStyles(targetDocument) {
    var // sheet is available after the element is inserted into the document
    _style_sheet;
    const currentCount = getPortalRefCount(targetDocument);
    if (currentCount > 0) {
        setPortalRefCount(targetDocument, currentCount + 1);
        return;
    }
    const style = targetDocument.createElement('style');
    style.id = PORTAL_STYLE_ELEMENT_ID;
    // Prepend so that consumer class names (applied later in document order) can override these
    // defaults via CSS source order at equal specificity — the same cascade behaviour as before.
    // Both prepend and append trigger one style recalculation; position in <head> does not change
    // the number of recalcs.
    targetDocument.head.prepend(style);
    (_style_sheet = style.sheet) === null || _style_sheet === void 0 ? void 0 : _style_sheet.insertRule(PORTAL_MOUNT_NODE_STYLE_RULE);
    setPortalRefCount(targetDocument, 1);
}
function ejectPortalMountNodeStyles(targetDocument) {
    const currentCount = getPortalRefCount(targetDocument);
    if (currentCount === 0) {
        return;
    }
    const newCount = currentCount - 1;
    if (newCount === 0) {
        var _targetDocument_head_querySelector;
        (_targetDocument_head_querySelector = targetDocument.head.querySelector(`#${PORTAL_STYLE_ELEMENT_ID}`)) === null || _targetDocument_head_querySelector === void 0 ? void 0 : _targetDocument_head_querySelector.remove();
    }
    setPortalRefCount(targetDocument, newCount);
}
function usePortalMountNodeStyles(disabled) {
    const { targetDocument } = (0, _reactsharedcontexts.useFluent_unstable)();
    useInsertionEffect(()=>{
        if (disabled || !targetDocument) {
            return;
        }
        injectPortalMountNodeStyles(targetDocument);
        return ()=>ejectPortalMountNodeStyles(targetDocument);
    }, [
        disabled,
        targetDocument
    ]);
}
