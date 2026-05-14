'use client';
import * as React from 'react';
const carouselSliderContext = React.createContext(undefined);
export const carouselSliderContextDefaultValue = {
    cardFocus: false
};
export const useCarouselSliderContext = ()=>{
    var _React_useContext;
    return (_React_useContext = React.useContext(carouselSliderContext)) !== null && _React_useContext !== void 0 ? _React_useContext : carouselSliderContextDefaultValue;
};
export const CarouselSliderContextProvider = carouselSliderContext.Provider;
