'use client';
import * as React from 'react';
const carouselNavContext = React.createContext(undefined);
export const carouselNavContextDefaultValue = {
    appearance: undefined
};
export const useCarouselNavContext = ()=>{
    var _React_useContext;
    return (_React_useContext = React.useContext(carouselNavContext)) !== null && _React_useContext !== void 0 ? _React_useContext : carouselNavContextDefaultValue;
};
export const CarouselNavContextProvider = carouselNavContext.Provider;
