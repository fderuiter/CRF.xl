import type { ButtonProps } from '@fluentui/react-button';
import type { ButtonSlots } from '@fluentui/react-button';
import type { ButtonState } from '@fluentui/react-button';
import type { ComponentProps } from '@fluentui/react-utilities';
import type { ComponentState } from '@fluentui/react-utilities';
import type { ContextSelector } from '@fluentui/react-context-selector';
import type { DistributiveOmit } from '@fluentui/react-utilities';
import type { DividerBaseState } from '@fluentui/react-divider';
import type { DividerSlots } from '@fluentui/react-divider';
import type { DividerState } from '@fluentui/react-divider';
import type { ForwardRefComponent } from '@fluentui/react-utilities';
import type { JSXElement } from '@fluentui/react-utilities';
import type * as React_2 from 'react';
import type { Slot } from '@fluentui/react-utilities';
import type { SlotClassNames } from '@fluentui/react-utilities';
import type { ToggleButtonProps } from '@fluentui/react-button';
import type { ToggleButtonState } from '@fluentui/react-button';

/**
 * Render the final JSX of Toolbar
 */
export declare const renderToolbar_unstable: (state: ToolbarBaseState, contextValues: ToolbarContextValues) => JSXElement;

/**
 * Render the final JSX of ToolbarGroup
 */
export declare const renderToolbarGroup_unstable: (state: ToolbarGroupState) => JSXElement;

declare type ToggableHandler = (e: React_2.MouseEvent | React_2.KeyboardEvent, name: string, value: string, checked?: boolean) => void;

/**
 * Toolbar component
 */
export declare const Toolbar: ForwardRefComponent<ToolbarProps>;

export declare type ToolbarBaseProps = Omit<ToolbarProps, 'size'>;

export declare type ToolbarBaseState = Omit<ToolbarState, 'size'>;

/**
 * ToolbarButton component is a Button to be used inside Toolbar
 * which will respect toolbar props such as `size`
 */
export declare const ToolbarButton: ForwardRefComponent<ToolbarButtonProps>;

export declare type ToolbarButtonBaseProps = DistributiveOmit<ToolbarButtonProps, 'appearance'>;

export declare type ToolbarButtonBaseState = DistributiveOmit<ToolbarButtonState, 'appearance' | 'size' | 'shape'>;

/**
 * ToolbarButton Props
 */
export declare type ToolbarButtonProps = ComponentProps<ButtonSlots> & Partial<Pick<ButtonProps, 'disabled' | 'disabledFocusable'>> & {
    appearance?: 'primary' | 'subtle' | 'transparent';
} & {
    vertical?: boolean;
};

/**
 * State used in rendering ToolbarButton
 */
export declare type ToolbarButtonState = ComponentState<Partial<ButtonSlots>> & ButtonState & Required<Pick<ToolbarButtonProps, 'vertical'>>;

declare type ToolbarCheckedValueChangeData = {
    /** The items for this value that are checked */
    checkedItems: string[];
    /** The name of the value */
    name: string;
};

declare type ToolbarCheckedValueChangeEvent = React_2.MouseEvent | React_2.KeyboardEvent;

export declare const toolbarClassNames: SlotClassNames<ToolbarSlots>;

export declare type ToolbarContextValue = Pick<ToolbarState, 'size' | 'vertical' | 'checkedValues'> & {
    handleToggleButton?: ToggableHandler;
    handleRadio?: ToggableHandler;
};

export declare type ToolbarContextValues = {
    toolbar: ToolbarContextValue;
};

/**
 * ToolbarDivider component
 */
export declare const ToolbarDivider: ForwardRefComponent<ToolbarDividerProps>;

export declare type ToolbarDividerBaseProps = ToolbarDividerProps;

export declare type ToolbarDividerBaseState = ComponentState<Partial<DividerSlots>> & DividerBaseState;

/**
 * ToolbarDivider Props
 */
export declare type ToolbarDividerProps = ComponentProps<Partial<DividerSlots>> & {
    /**
     * A divider can be horizontal or vertical (default).
     *
     * @default true
     */
    vertical?: boolean;
};

/**
 * State used in rendering ToolbarDivider
 */
export declare type ToolbarDividerState = ComponentState<Partial<DividerSlots>> & DividerState;

/**
 * ToolbarGroup component is a Button to be used inside Toolbar
 * which will respect toolbar props such as `size`
 */
export declare const ToolbarGroup: ForwardRefComponent<ToolbarGroupProps>;

export declare const toolbarGroupClassNames: SlotClassNames<ToolbarGroupSlots>;

/**
 * ToolbarButton Props
 */
export declare type ToolbarGroupProps = ComponentProps<ToolbarGroupSlots>;

declare type ToolbarGroupSlots = {
    root: Slot<'div'>;
};

/**
 * State used in rendering ToolbarButton
 */
export declare type ToolbarGroupState = ComponentState<ToolbarGroupSlots> & {
    vertical?: boolean;
};

/**
 * Toolbar Props
 */
export declare type ToolbarProps = ComponentProps<ToolbarSlots> & {
    /**
     * Toolbar can have small or medium size
     *
     * @default medium
     */
    size?: 'small' | 'medium' | 'large';
    /**
     * Toolbar can be vertical styled
     * @default false
     */
    vertical?: boolean;
    /**
     * Map of all checked values
     */
    checkedValues?: Record<string, string[]>;
    /**
     * Default values to be checked on mount
     */
    defaultCheckedValues?: Record<string, string[]>;
    /**
     * Callback when checked items change for value with a name
     *
     * @param event - React's original SyntheticEvent
     * @param data - A data object with relevant information
     */
    onCheckedValueChange?: (e: ToolbarCheckedValueChangeEvent, data: ToolbarCheckedValueChangeData) => void;
};

/**
 * ToolbarRadioButton component
 */
export declare const ToolbarRadioButton: ForwardRefComponent<ToolbarRadioButtonProps>;

export declare type ToolbarRadioButtonBaseProps = DistributiveOmit<ToolbarRadioButtonProps, 'appearance'>;

export declare type ToolbarRadioButtonBaseState = DistributiveOmit<ToolbarRadioButtonState, 'appearance' | 'size' | 'shape'>;

/**
 * ToolbarRadioButton Props
 */
export declare type ToolbarRadioButtonProps = ComponentProps<ButtonSlots> & Partial<Pick<ToggleButtonProps, 'disabled' | 'disabledFocusable' | 'size'>> & {
    appearance?: 'primary' | 'subtle' | 'transparent';
    name: string;
    value: string;
};

/**
 * State used in rendering ToolbarRadioButton
 */
export declare type ToolbarRadioButtonState = ComponentState<Partial<ButtonSlots>> & ToggleButtonState & Required<Pick<ToggleButtonProps, 'checked'>> & Pick<ToolbarRadioButtonProps, 'name' | 'value'>;

/**
 * ToolbarRadioGroup component is a Button to be used inside Toolbar
 * which will respect toolbar props such as `size`
 */
export declare const ToolbarRadioGroup: ForwardRefComponent<ToolbarRadioGroupProps>;

/**
 * ToolbarButton Props
 */
export declare type ToolbarRadioGroupProps = ComponentProps<ToolbarRadioGroupSlots>;

declare type ToolbarRadioGroupSlots = {
    root: Slot<'div'>;
};

/**
 * State used in rendering ToolbarButton
 */
export declare type ToolbarRadioGroupState = ComponentState<ToolbarRadioGroupSlots>;

export declare type ToolbarSlots = {
    root: Slot<'div'>;
};

/**
 * State used in rendering Toolbar
 */
export declare type ToolbarState = ComponentState<ToolbarSlots> & Required<Pick<ToolbarProps, 'size' | 'checkedValues' | 'vertical'>> & Pick<ToolbarProps, 'defaultCheckedValues' | 'onCheckedValueChange'> & {
    handleToggleButton: ToggableHandler;
    handleRadio: ToggableHandler;
};

/**
 * ToolbarToggleButton component
 */
export declare const ToolbarToggleButton: ForwardRefComponent<ToolbarToggleButtonProps>;

export declare type ToolbarToggleButtonBaseProps = DistributiveOmit<ToolbarToggleButtonProps, 'appearance'>;

export declare type ToolbarToggleButtonBaseState = DistributiveOmit<ToolbarToggleButtonState, 'appearance' | 'size' | 'shape'>;

/**
 * ToolbarToggleButton Props
 */
export declare type ToolbarToggleButtonProps = ComponentProps<ButtonSlots> & Partial<Pick<ToggleButtonProps, 'disabled' | 'disabledFocusable' | 'size'>> & {
    appearance?: 'primary' | 'subtle' | 'transparent';
    name: string;
    value: string;
};

/**
 * State used in rendering ToolbarToggleButton
 */
export declare type ToolbarToggleButtonState = ComponentState<Partial<ButtonSlots>> & ToggleButtonState & Required<Pick<ToggleButtonProps, 'checked'>> & Pick<ToolbarToggleButtonProps, 'name' | 'value'>;

/**
 * Create the state required to render Toolbar.
 *
 * The returned state can be modified with hooks such as useToolbarStyles_unstable,
 * before being passed to renderToolbar_unstable.
 *
 * @param props - props from this instance of Toolbar
 * @param ref - reference to root HTMLElement of Toolbar
 */
export declare const useToolbar_unstable: (props: ToolbarProps, ref: React_2.Ref<HTMLElement>) => ToolbarState;

/**
 * Base hook that builds Toolbar state for behavior and structure only.
 * It does not add arrow key navigation, which is handled by `useToolbar_unstable`.
 *
 * @internal
 * @param props - Props for this Toolbar instance.
 * @param ref - Ref to the root HTMLElement.
 */
export declare const useToolbarBase_unstable: (props: ToolbarBaseProps, ref: React_2.Ref<HTMLElement>) => ToolbarBaseState;

/**
 * Given user props, defines default props for the Button, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the Button component.
 * @param ref - User provided ref to be passed to the Button component.
 */
export declare const useToolbarButton_unstable: (props: ToolbarButtonProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarButtonState;

/**
 * Base hook that builds Toolbar Button state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the Button component.
 * @param ref - User provided ref to be passed to the Button component.
 */
export declare const useToolbarButtonBase_unstable: (props: ToolbarButtonBaseProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarButtonBaseState;

/**
 * Apply styling to the ToolbarButton slots based on the state
 */
export declare const useToolbarButtonStyles_unstable: (state: ToolbarButtonState) => void;

export declare const useToolbarContext_unstable: <T>(selector: ContextSelector<ToolbarContextValue, T>) => T;

export declare function useToolbarContextValues_unstable(state: ToolbarState): ToolbarContextValues;

/**
 * Create the state required to render ToolbarDivider.
 *
 * The returned state can be modified with hooks such as useToolbarDividerStyles_unstable,
 * before being passed to renderToolbar_unstable.
 *
 * @param props - props from this instance of ToolbarDivider
 * @param ref - reference to root HTMLElement of ToolbarDivider
 */
export declare const useToolbarDivider_unstable: (props: ToolbarDividerProps, ref: React_2.Ref<HTMLElement>) => ToolbarDividerState;

/**
 * Base hook that builds ToolbarDivider state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - props from this instance of ToolbarDivider
 * @param ref - reference to root HTMLElement of ToolbarDivider
 */
export declare const useToolbarDividerBase_unstable: (props: ToolbarDividerBaseProps, ref: React_2.Ref<HTMLElement>) => ToolbarDividerBaseState;

/**
 * Apply styling to the ToolbarDivider slots based on the state
 */
export declare const useToolbarDividerStyles_unstable: (state: ToolbarDividerState) => ToolbarDividerState;

/**
 * Given user props, defines default props for the Group
 * @param props - User provided props to the Group component.
 * @param ref - User provided ref to be passed to the Group component.
 */
export declare const useToolbarGroup_unstable: (props: ToolbarGroupProps, ref: React_2.Ref<HTMLDivElement>) => ToolbarGroupState;

/**
 * Apply styling to the Toolbar slots based on the state
 */
export declare const useToolbarGroupStyles_unstable: (state: ToolbarGroupState) => ToolbarGroupState;

/**
 * Given user props, defines default props for the RadioButton, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the RadioButton component.
 * @param ref - User provided ref to be passed to the RadioButton component.
 */
export declare const useToolbarRadioButton_unstable: (props: ToolbarRadioButtonProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarRadioButtonState;

/**
 * Base hook that builds Toolbar RadioButton state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the RadioButton component.
 * @param ref - User provided ref to be passed to the RadioButton component.
 */
export declare const useToolbarRadioButtonBase_unstable: (props: ToolbarRadioButtonBaseProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarRadioButtonBaseState;

/**
 * Apply styling to the ToolbarRadioButton slots based on the state
 */
export declare const useToolbarRadioButtonStyles_unstable: (state: ToolbarRadioButtonState) => ToolbarRadioButtonState;

/**
 * Apply styling to the Toolbar slots based on the state
 */
export declare const useToolbarStyles_unstable: (state: ToolbarState) => ToolbarState;

/**
 * Given user props, defines default props for the ToggleButton, calls useButtonState and useChecked, and returns
 * processed state.
 * @param props - User provided props to the ToggleButton component.
 * @param ref - User provided ref to be passed to the ToggleButton component.
 */
export declare const useToolbarToggleButton_unstable: (props: ToolbarToggleButtonProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarToggleButtonState;

/**
 * Base hook that builds Toolbar ToggleButton state for behavior and structure only.
 * It does not provide any design-related defaults.
 *
 * @internal
 * @param props - User provided props to the ToggleButton component.
 * @param ref - User provided ref to be passed to the ToggleButton component.
 */
export declare const useToolbarToggleButtonBase_unstable: (props: ToolbarToggleButtonBaseProps, ref: React_2.Ref<HTMLButtonElement | HTMLAnchorElement>) => ToolbarToggleButtonBaseState;

/**
 * Apply styling to the ToolbarToggleButton slots based on the state
 */
export declare const useToolbarToggleButtonStyles_unstable: (state: ToolbarToggleButtonState) => ToolbarToggleButtonState;

export { }
