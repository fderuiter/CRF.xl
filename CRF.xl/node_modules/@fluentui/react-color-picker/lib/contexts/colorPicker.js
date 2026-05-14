'use client';
import { createContext, useContextSelector } from '@fluentui/react-context-selector';
export const colorPickerContextDefaultValue = {
    requestChange: ()=>{
    /*noop*/ },
    color: undefined,
    shape: 'rounded'
};
const colorPickerContext = createContext(undefined);
export const ColorPickerProvider = colorPickerContext.Provider;
export const useColorPickerContextValue_unstable = (selector)=>useContextSelector(colorPickerContext, (ctx = colorPickerContextDefaultValue)=>selector(ctx));
