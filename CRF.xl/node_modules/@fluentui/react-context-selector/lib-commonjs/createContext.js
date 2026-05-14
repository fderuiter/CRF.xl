'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createContext", {
    enumerable: true,
    get: function() {
        return createContext;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _reactutilities = require("@fluentui/react-utilities");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _scheduler = require("scheduler");
const createProvider = (Original)=>{
    const Provider = (props)=>{
        // Holds an actual "props.value"
        const valueRef = _react.useRef(props.value);
        // A stable object, is used to avoid context updates via mutation of its values.
        const contextValue = _react.useRef(null);
        if (!contextValue.current) {
            contextValue.current = {
                value: valueRef,
                listeners: []
            };
        }
        (0, _reactutilities.useIsomorphicLayoutEffect)(()=>{
            valueRef.current = props.value;
            (0, _scheduler.unstable_runWithPriority)(_scheduler.unstable_NormalPriority, ()=>{
                contextValue.current.listeners.forEach((listener)=>{
                    listener(props.value);
                });
            });
        }, [
            props.value
        ]);
        return _react.createElement(Original, {
            value: contextValue.current
        }, props.children);
    };
    /* istanbul ignore else */ if (process.env.NODE_ENV !== 'production') {
        Provider.displayName = 'ContextSelector.Provider';
    }
    return Provider;
};
const createContext = (defaultValue)=>{
    // eslint-disable-next-line @fluentui/no-context-default-value
    const context = _react.createContext({
        value: {
            current: defaultValue
        },
        listeners: [],
        isDefault: true
    });
    context.Provider = createProvider(context.Provider);
    // We don't support Consumer API
    delete context.Consumer;
    return context;
};
