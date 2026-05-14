/**
 * Verifies if an application can use DOM.
 *
 * @internal
 */
export function canUseDOM() {
    return typeof window !== 'undefined' && !!(window.document && window.document.createElement);
}
//# sourceMappingURL=canUseDOM.js.map