'use client';
import * as React from 'react';
export function useCarouselSliderContextValues_unstable(state) {
    const { cardFocus } = state;
    const carouselSlider = React.useMemo(()=>({
            cardFocus
        }), [
        cardFocus
    ]);
    return {
        carouselSlider
    };
}
