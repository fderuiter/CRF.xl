/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { type DummyInputObserver as DummyInputObserverInterface, type GetWindow, type SysProps, type TabsterCore } from "./Types.js";
import { WeakHTMLElement } from "./Utils.js";
export interface DummyInputProps {
    /** The input is created to be used only once and autoremoved when focused. */
    isPhantom?: boolean;
    /** Whether the input is before or after the content it is guarding.  */
    isFirst: boolean;
}
export type DummyInputFocusCallback = (dummyInput: DummyInput, isBackward: boolean, relatedTarget: HTMLElement | null) => void;
/**
 * Dummy HTML elements that are used as focus sentinels for the DOM enclosed within them
 */
export declare class DummyInput {
    private _isPhantom;
    private _fixedTarget?;
    private _disposeTimer;
    private _clearDisposeTimeout;
    input: HTMLElement | undefined;
    useDefaultAction?: boolean;
    isFirst: DummyInputProps["isFirst"];
    isOutside: boolean;
    /** Called when the input is focused */
    onFocusIn?: DummyInputFocusCallback;
    /** Called when the input is blurred */
    onFocusOut?: DummyInputFocusCallback;
    constructor(getWindow: GetWindow, isOutside: boolean, props: DummyInputProps, element?: WeakHTMLElement, fixedTarget?: WeakHTMLElement);
    dispose(): void;
    setTopLeft(top: number, left: number): void;
    private _isBackward;
    private _focusIn;
    private _focusOut;
}
export declare const DummyInputManagerPriorities: {
    readonly Root: 1;
    readonly Modalizer: 2;
    readonly Mover: 3;
    readonly Groupper: 4;
};
export declare class DummyInputManager {
    private _instance?;
    private _onFocusIn?;
    private _onFocusOut?;
    protected _element: WeakHTMLElement;
    constructor(tabster: TabsterCore, element: WeakHTMLElement, priority: number, sys: SysProps | undefined, outsideByDefault?: boolean, callForDefaultAction?: boolean);
    protected _setHandlers(onFocusIn?: DummyInputFocusCallback, onFocusOut?: DummyInputFocusCallback): void;
    moveOut(backwards: boolean): void;
    moveOutWithDefaultAction(backwards: boolean, relatedEvent: KeyboardEvent): void;
    getHandler(isIn: boolean): DummyInputFocusCallback | undefined;
    setTabbable(tabbable: boolean): void;
    dispose(): void;
    static moveWithPhantomDummy(tabster: TabsterCore, element: HTMLElement, // The target element to move to or out of.
    moveOutOfElement: boolean, // Whether to move out of the element or into it.
    isBackward: boolean, // Are we tabbing of shift-tabbing?
    relatedEvent: KeyboardEvent): void;
    static addPhantomDummyWithTarget(tabster: TabsterCore, sourceElement: HTMLElement, isBackward: boolean, targetElement: HTMLElement): void;
}
export declare class DummyInputObserver implements DummyInputObserverInterface {
    private _win?;
    private _updateQueue;
    private _updateTimer?;
    private _lastUpdateQueueTime;
    private _changedParents;
    private _updateDummyInputsTimer?;
    private _dummyElements;
    private _dummyCallbacks;
    domChanged?(parent: HTMLElement): void;
    constructor(win: GetWindow);
    add(dummy: HTMLElement, callback: () => void): void;
    remove(dummy: HTMLElement): void;
    dispose(): void;
    private _domChanged;
    updatePositions(compute: (scrollTopLeftCache: Map<HTMLElement, {
        scrollTop: number;
        scrollLeft: number;
    } | null>) => () => void): void;
    private _scheduledUpdatePositions;
}
export declare function getDummyInputContainer(element: HTMLElement | null | undefined): HTMLElement | null;
//# sourceMappingURL=DummyInput.d.ts.map