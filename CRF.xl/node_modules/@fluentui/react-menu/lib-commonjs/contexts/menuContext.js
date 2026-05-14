'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    MenuContext: function() {
        return MenuContext;
    },
    MenuProvider: function() {
        return MenuProvider;
    },
    useMenuContext_unstable: function() {
        return useMenuContext_unstable;
    }
});
const _reactcontextselector = require("@fluentui/react-context-selector");
const MenuContext = (0, _reactcontextselector.createContext)(undefined);
const menuContextDefaultValue = {
    open: false,
    setOpen: ()=>false,
    checkedValues: {},
    onCheckedValueChange: ()=>null,
    isSubmenu: false,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    triggerRef: {
        current: null
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    menuPopoverRef: {
        current: null
    },
    mountNode: null,
    triggerId: '',
    openOnContext: false,
    openOnHover: false,
    hasIcons: false,
    hasCheckmarks: false,
    inline: false,
    persistOnItemClick: false
};
const MenuProvider = MenuContext.Provider;
const useMenuContext_unstable = (selector)=>(0, _reactcontextselector.useContextSelector)(MenuContext, (ctx = menuContextDefaultValue)=>selector(ctx));
