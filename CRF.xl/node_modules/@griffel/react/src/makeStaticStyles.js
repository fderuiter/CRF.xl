'use client';
import { makeStaticStyles as vanillaMakeStaticStyles } from '@griffel/core';
import { insertionFactory } from './insertionFactory.js';
import { useRenderer } from './RendererContext.js';
export function makeStaticStyles(styles) {
    const getStyles = vanillaMakeStaticStyles(styles, insertionFactory);
    if (process.env.NODE_ENV === 'test') {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => { };
    }
    return function useStaticStyles() {
        const renderer = useRenderer();
        const options = { renderer };
        return getStyles(options);
    };
}
//# sourceMappingURL=makeStaticStyles.js.map