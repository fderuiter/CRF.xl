'use client';
import * as React from 'react';
export function useTeachingPopoverCarouselContextValues_unstable(state) {
    const { store, value, selectPageByValue, selectPageByDirection } = state;
    const carousel = React.useMemo(()=>({
            store,
            value,
            selectPageByDirection,
            selectPageByValue
        }), [
        store,
        value,
        selectPageByDirection,
        selectPageByValue
    ]);
    return {
        carousel
    };
}
