import { type FC, type ReactNode } from 'react';
export interface TextDirectionProviderProps {
    /** Indicates the directionality of the element's text. */
    dir: 'ltr' | 'rtl';
    /**
     * Content wrapped by the TextDirectionProvider.
     */
    children: ReactNode;
}
/**
 * @public
 */
export declare const TextDirectionProvider: FC<TextDirectionProviderProps>;
/**
 * Returns current directionality of the element's text.
 *
 * @private
 */
export declare function useTextDirection(): "rtl" | "ltr";
