'use client';
import { makeResetStyles as vanillaMakeResetStyles } from '@griffel/core';
import { insertionFactory } from './insertionFactory.js';
import { useRenderer } from './RendererContext.js';
import { useTextDirection } from './TextDirectionContext.js';
import { isInsideComponent } from './utils/isInsideComponent.js';
export function makeResetStyles(styles) {
    const getStyles = vanillaMakeResetStyles(styles, insertionFactory);
    if (process.env.NODE_ENV !== 'production') {
        if (isInsideComponent()) {
            throw new Error([
                "makeResetStyles(): this function cannot be called in component's scope.",
                'All makeResetStyles() calls should be top level i.e. in a root scope of a file.',
            ].join(' '));
        }
    }
    return function useClassName() {
        const dir = useTextDirection();
        const renderer = useRenderer();
        return getStyles({ dir, renderer });
    };
}
//# sourceMappingURL=makeResetStyles.js.map