import { commands as rawCommands } from '@vitest/browser/context';
import { type GriffelResetStyle, type GriffelStyle } from '../index.js';
export declare const commands: typeof rawCommands & {
    mouseDown(): Promise<void>;
    mouseUp(): Promise<void>;
};
export declare const COLORS: {
    WHITE: string;
    YELLOW: string;
    CYAN: string;
    ORANGE: string;
    BLUE: string;
    RED: string;
    BLACK: string;
    LIGHT_GREEN: string;
};
export declare function render(html: string): void;
export declare function getComputedBackgroundColor(el: Element): string;
export declare function getColor(el: Element): string;
export declare function applyStyles<S extends string>(stylesBySlot: Record<S, GriffelStyle>): Record<S, string>;
export declare function applyResetStyles(styles: GriffelResetStyle): string;
/**
 * Clears the DOM and removes Griffel's injected style sheets. Call from
 * `beforeEach` so each test starts from a clean document and an empty
 * renderer cache.
 */
export declare function resetBrowserTestState(): void;
