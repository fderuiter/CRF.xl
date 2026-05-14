'use client';
import * as React from 'react';
export const useAvatarGroupContextValues = (state)=>{
    const { layout, size } = state;
    const avatarGroup = React.useMemo(()=>({
            layout,
            size
        }), [
        layout,
        size
    ]);
    return {
        avatarGroup
    };
};
