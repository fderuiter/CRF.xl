'use client';
import * as React from 'react';
export function useListContextValues_unstable(state) {
    const { selection, navigationMode, listItemRole, validateListItem } = state;
    const listContext = React.useMemo(()=>({
            selection,
            navigationMode,
            validateListItem
        }), [
        selection,
        navigationMode,
        validateListItem
    ]);
    const synchronousContext = React.useMemo(()=>({
            listItemRole,
            navigationMode
        }), [
        listItemRole,
        navigationMode
    ]);
    return {
        listContext,
        synchronousContext
    };
}
