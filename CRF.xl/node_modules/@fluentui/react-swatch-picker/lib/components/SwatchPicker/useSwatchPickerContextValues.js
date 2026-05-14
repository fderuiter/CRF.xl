'use client';
import * as React from 'react';
export const useSwatchPickerContextValues = (state)=>{
    const { isGrid, size, shape, spacing, requestSelectionChange, selectedValue } = state;
    const swatchPicker = React.useMemo(()=>({
            isGrid,
            size,
            shape,
            spacing,
            selectedValue,
            requestSelectionChange
        }), [
        isGrid,
        size,
        shape,
        spacing,
        selectedValue,
        requestSelectionChange
    ]);
    return {
        swatchPicker
    };
};
