import type { GriffelRenderer } from '@griffel/core';
import { type FC, type ReactNode } from 'react';
export interface RendererProviderProps {
    /** An instance of Griffel renderer. */
    renderer: GriffelRenderer;
    /**
     * Document used to insert CSS variables to head
     */
    targetDocument?: Document;
    /**
     * Content wrapped by the RendererProvider
     */
    children: ReactNode;
}
/**
 * @public
 */
export declare const RendererProvider: FC<RendererProviderProps>;
/**
 * Returns an instance of current makeStyles() renderer.
 *
 * @private Exported as "useRenderer_unstable" use it on own risk. Can be changed or removed without a notice.
 */
export declare function useRenderer(): GriffelRenderer;
