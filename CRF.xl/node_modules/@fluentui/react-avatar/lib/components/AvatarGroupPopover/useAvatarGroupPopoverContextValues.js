'use client';
import * as React from 'react';
export const useAvatarGroupPopoverContextValues_unstable = (state)=>{
    const avatarGroup = React.useMemo(()=>({
            isOverflow: true,
            size: 24
        }), []);
    return {
        avatarGroup
    };
};
