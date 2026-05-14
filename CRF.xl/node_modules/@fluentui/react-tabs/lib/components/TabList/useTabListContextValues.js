'use client';
import * as React from 'react';
export function useTabListContextValues_unstable(state) {
    const { appearance, reserveSelectedTabSpace, disabled, selectTabOnFocus, selectedValue: selectedKey, onRegister, onUnregister, onSelect, getRegisteredTabs, size, vertical } = state;
    const tabList = React.useMemo(()=>({
            appearance,
            reserveSelectedTabSpace,
            disabled,
            selectTabOnFocus,
            selectedValue: selectedKey,
            onSelect,
            onRegister,
            onUnregister,
            getRegisteredTabs,
            size,
            vertical
        }), [
        appearance,
        reserveSelectedTabSpace,
        disabled,
        selectTabOnFocus,
        selectedKey,
        onSelect,
        onRegister,
        onUnregister,
        getRegisteredTabs,
        size,
        vertical
    ]);
    return {
        tabList
    };
}
