'use client';
import * as React from 'react';
export function useAccordionContextValues_unstable(state) {
    const { navigation, openItems, requestToggle, multiple, collapsible } = state;
    const accordion = React.useMemo(()=>({
            navigation,
            openItems,
            requestToggle,
            collapsible,
            multiple
        }), [
        navigation,
        openItems,
        requestToggle,
        collapsible,
        multiple
    ]);
    return {
        accordion
    };
}
