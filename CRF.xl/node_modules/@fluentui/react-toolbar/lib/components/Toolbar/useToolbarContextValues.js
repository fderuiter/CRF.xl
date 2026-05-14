'use client';
import * as React from 'react';
export function useToolbarContextValues_unstable(state) {
    const { size, handleToggleButton, vertical, checkedValues, handleRadio } = state;
    const toolbar = React.useMemo(()=>({
            size,
            vertical,
            handleToggleButton,
            handleRadio,
            checkedValues
        }), [
        size,
        vertical,
        handleToggleButton,
        handleRadio,
        checkedValues
    ]);
    return {
        toolbar
    };
}
