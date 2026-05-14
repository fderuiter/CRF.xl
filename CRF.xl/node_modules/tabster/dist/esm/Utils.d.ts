/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { type GetWindow, type RadioButtonGroup, type TabsterAttributeProps, type TabsterCore, type TabsterPart as TabsterPartInterface, type Visibility, type WeakHTMLElement as WeakHTMLElementInterface } from "./Types.js";
interface HTMLElementWithBoundingRectCacheId extends HTMLElement {
    __tabsterCacheId?: string;
}
export interface WindowWithUID extends Window {
    __tabsterCrossOriginWindowUID?: string;
}
export interface HTMLElementWithUID extends HTMLElement {
    __tabsterElementUID?: string;
}
export interface TabsterDOMRect {
    bottom: number;
    left: number;
    right: number;
    top: number;
}
export interface InstanceContext {
    elementByUId: {
        [uid: string]: WeakHTMLElement<HTMLElementWithUID>;
    };
    containerBoundingRectCache: {
        [id: string]: {
            rect: TabsterDOMRect;
            element: HTMLElementWithBoundingRectCacheId;
        };
    };
    lastContainerBoundingRectCacheId: number;
    containerBoundingRectCacheTimer?: number;
}
export declare function getInstanceContext(getWindow: GetWindow): InstanceContext;
export declare function disposeInstanceContext(win: Window): void;
export declare function hasSubFocusable(element: HTMLElement): boolean;
export declare class WeakHTMLElement<T extends HTMLElement = HTMLElement, D = undefined> implements WeakHTMLElementInterface<D> {
    private _ref;
    private _data;
    constructor(element: T, data?: D);
    get(): T | undefined;
    getData(): D | undefined;
}
export declare function createElementTreeWalker(doc: Document, root: Node, acceptNode: (node: Node) => number): TreeWalker | undefined;
export declare function getBoundingRect(getWindow: GetWindow, element: HTMLElementWithBoundingRectCacheId): TabsterDOMRect;
export declare function isElementVerticallyVisibleInContainer(getWindow: GetWindow, element: HTMLElement, tolerance: number): boolean;
export declare function isElementVisibleInContainer(getWindow: GetWindow, element: HTMLElement, gap?: number): Visibility;
export declare function scrollIntoView(getWindow: GetWindow, element: HTMLElement, alignToTop: boolean): void;
export declare function getScrollableContainer(element: HTMLElement): HTMLElement | null;
export declare function makeFocusIgnored(element: HTMLElement): void;
export declare function shouldIgnoreFocus(element: HTMLElement): boolean;
export declare function getUId(wnd: Window): string;
export declare function getElementUId(getWindow: GetWindow, element: HTMLElementWithUID): string;
export declare function getElementByUId(context: InstanceContext, uid: string): WeakHTMLElement<HTMLElementWithUID, undefined> | undefined;
export declare function getWindowUId(win: WindowWithUID): string;
export declare function clearElementCache(getWindow: GetWindow, parent?: HTMLElement): void;
export declare function documentContains(doc: Document | null | undefined, element: HTMLElement): boolean;
export declare function matchesSelector(element: HTMLElement, selector: string): boolean;
export declare abstract class TabsterPart<P, D = undefined> implements TabsterPartInterface<P> {
    protected _tabster: TabsterCore;
    protected _element: WeakHTMLElement<HTMLElement, D>;
    protected _props: P;
    readonly id: string;
    constructor(tabster: TabsterCore, element: HTMLElement, props: P);
    getElement(): HTMLElement | undefined;
    getProps(): P;
    setProps(props: P): void;
}
export declare function getLastChild(container: HTMLElement): HTMLElement | undefined;
export declare function getAdjacentElement(from: HTMLElement, prev?: boolean): HTMLElement | undefined;
export declare function augmentAttribute(tabster: TabsterCore, element: HTMLElement, name: string, value?: string | null): boolean;
export declare function getTabsterAttributeOnElement(element: HTMLElement): TabsterAttributeProps | null;
export declare function isDisplayNone(element: HTMLElement): boolean;
export declare function isRadio(element: HTMLElement): boolean;
export declare function getRadioButtonGroup(element: HTMLElement): RadioButtonGroup | undefined;
export {};
/**
 * If the passed element is Tabster dummy input, returns the container element this dummy input belongs to.
 * @param element Element to check for being dummy input.
 * @returns Dummy input container element (if the passed element is a dummy input) or null.
 */
//# sourceMappingURL=Utils.d.ts.map