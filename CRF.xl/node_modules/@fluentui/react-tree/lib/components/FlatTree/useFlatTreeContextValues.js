'use client';
import * as React from 'react';
export const useFlatTreeContextValues_unstable = (state)=>{
    const { openItems, level, contextType, treeType, checkedItems, selectionMode, navigationMode, appearance, size, requestTreeResponse, forceUpdateRovingTabIndex } = state;
    const tree = React.useMemo(()=>({
            treeType,
            size,
            openItems,
            appearance,
            checkedItems,
            selectionMode,
            navigationMode,
            contextType,
            level,
            requestTreeResponse,
            forceUpdateRovingTabIndex
        }), [
        treeType,
        size,
        openItems,
        appearance,
        checkedItems,
        selectionMode,
        navigationMode,
        contextType,
        level,
        requestTreeResponse,
        forceUpdateRovingTabIndex
    ]);
    return {
        tree
    };
};
