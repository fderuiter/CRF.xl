'use client';
import * as React from 'react';
export function useMenuListContextValues_unstable(state) {
    const { checkedValues, hasCheckmarks, hasIcons, selectRadio, setFocusByFirstCharacter, toggleCheckbox } = state;
    const menuList = React.useMemo(()=>({
            checkedValues,
            hasCheckmarks,
            hasIcons,
            selectRadio,
            setFocusByFirstCharacter,
            toggleCheckbox
        }), [
        checkedValues,
        hasCheckmarks,
        hasIcons,
        selectRadio,
        setFocusByFirstCharacter,
        toggleCheckbox
    ]);
    return {
        menuList
    };
}
