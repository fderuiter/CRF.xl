'use client';
import { useIsomorphicLayoutEffect } from '@fluentui/react-utilities';
import * as React from 'react';
import { unstable_NormalPriority as NormalPriority, unstable_runWithPriority as runWithPriority } from 'scheduler';
const createProvider = (Original)=>{
    const Provider = (props)=>{
        // Holds an actual "props.value"
        const valueRef = React.useRef(props.value);
        // A stable object, is used to avoid context updates via mutation of its values.
        const contextValue = React.useRef(null);
        if (!contextValue.current) {
            contextValue.current = {
                value: valueRef,
                listeners: []
            };
        }
        useIsomorphicLayoutEffect(()=>{
            valueRef.current = props.value;
            runWithPriority(NormalPriority, ()=>{
                contextValue.current.listeners.forEach((listener)=>{
                    listener(props.value);
                });
            });
        }, [
            props.value
        ]);
        return React.createElement(Original, {
            value: contextValue.current
        }, props.children);
    };
    /* istanbul ignore else */ if (process.env.NODE_ENV !== 'production') {
        Provider.displayName = 'ContextSelector.Provider';
    }
    return Provider;
};
/**
 * @internal
 */ export const createContext = (defaultValue)=>{
    // eslint-disable-next-line @fluentui/no-context-default-value
    const context = React.createContext({
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
