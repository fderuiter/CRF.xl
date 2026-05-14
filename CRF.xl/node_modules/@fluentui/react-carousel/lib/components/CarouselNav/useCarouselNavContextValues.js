'use client';
import * as React from 'react';
export function useCarouselNavContextValues_unstable(state) {
    const { appearance } = state;
    const carouselNav = React.useMemo(()=>({
            appearance
        }), [
        appearance
    ]);
    return {
        carouselNav
    };
}
