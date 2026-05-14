import type * as React_2 from 'react';

/**
 * @internal
 */
export declare type Context<Value> = React_2.Context<Value> & {
    Provider: React_2.FC<React_2.ProviderProps<Value>>;
    Consumer: never;
};

export declare type ContextSelector<Value, SelectedValue> = (value: Value) => SelectedValue;

/**
 * @internal
 */
export declare type ContextValue<Value> = {
    /** Holds a set of subscribers from components. */
    listeners: ((payload: Value) => void)[];
    /** Holds an actual value of React's context that will be propagated down for computations. */
    value: {
        current: Value;
    };
    /** Indicates if a context holds default value. */
    isDefault?: boolean;
};

/**
 * @internal
 */
export declare const createContext: <Value>(defaultValue: Value) => Context<Value>;

/**
 * This hook returns context selected value by selector.
 * It will only accept context created by `createContext`.
 * It will trigger re-render if only the selected value is referentially changed.
 *
 * @internal
 */
export declare const useContextSelector: <Value, SelectedValue>(context: Context<Value>, selectorFn: ContextSelector<Value, SelectedValue>) => SelectedValue;

/**
 * Utility hook for contexts created by react-context-selector to determine if a parent context exists
 * WARNING: This hook will not work for native React contexts
 *
 * @internal
 * @param context - context created by react-context-selector
 * @returns whether the hook is wrapped by a parent context
 */
export declare function useHasParentContext<Value>(context: Context<Value>): boolean;

export { }
