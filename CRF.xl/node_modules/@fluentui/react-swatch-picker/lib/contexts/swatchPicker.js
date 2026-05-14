'use client';
import { createContext, useContextSelector } from '@fluentui/react-context-selector';
export const swatchPickerContextDefaultValue = {
    requestSelectionChange: ()=>{
    /*noop*/ },
    isGrid: false,
    size: 'medium',
    shape: 'square',
    spacing: 'medium',
    selectedValue: undefined
};
const SwatchPickerContext = createContext(undefined);
export const SwatchPickerProvider = SwatchPickerContext.Provider;
export const useSwatchPickerContextValue_unstable = (selector)=>useContextSelector(SwatchPickerContext, (ctx = swatchPickerContextDefaultValue)=>selector(ctx));
