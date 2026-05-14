'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useContextSelector", {
    enumerable: true,
    get: function() {
        return useContextSelector;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _reactutilities = require("@fluentui/react-utilities");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useContextSelector = (context, selectorFn)=>{
    const contextValue = _react.useContext(context);
    const { value: valueRef, listeners } = contextValue;
    // Read valueRef during render and return selector(value) directly. This is analogous to `useSyncExternalStore`'s
    // `getSnapshot` and is the only way to select a slice from a shared ref-based store without re-rendering every
    // consumer on every provider update.
    const valueAtRender = selectorFn(valueRef.current);
    const [, forceUpdate] = _react.useReducer((x)=>x + 1, 0);
    // Refs holding the current selector and the most-recently-returned slice.
    // Updated in a layout effect (ordering: children first, then provider) so
    // they are current by the time the provider's listener loop fires.
    const selectorFnRef = _react.useRef(selectorFn);
    const lastValueAtRender = _react.useRef(valueAtRender);
    (0, _reactutilities.useIsomorphicLayoutEffect)(()=>{
        selectorFnRef.current = selectorFn;
        lastValueAtRender.current = valueAtRender;
    });
    (0, _reactutilities.useIsomorphicLayoutEffect)(()=>{
        const listener = (payload)=>{
            // Selectors can throw on transiently-inconsistent inputs (stale props vs. newer context value). Swallow so a
            // single consumer's throw doesn't abort the provider's `listeners.forEach`.
            try {
                const nextSelectedValue = selectorFnRef.current(payload);
                if (!Object.is(lastValueAtRender.current, nextSelectedValue)) {
                    forceUpdate();
                }
            } catch  {
            // ignored (stale props or similar — heals on the next parent-driven render)
            }
        };
        listeners.push(listener);
        // Effect-fixup: catch updates that occurred between render and effect run (Relay's useFragmentInternal pattern).
        listener(valueRef.current);
        return ()=>{
            const index = listeners.indexOf(listener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        };
    }, [
        listeners,
        valueRef
    ]);
    return valueAtRender;
};
