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
    ListboxContext: function() {
        return ListboxContext;
    },
    ListboxProvider: function() {
        return ListboxProvider;
    },
    useListboxContext_unstable: function() {
        return useListboxContext_unstable;
    }
});
const _reactcontextselector = require("@fluentui/react-context-selector");
const listboxContextDefaultValue = {
    activeOption: undefined,
    focusVisible: false,
    multiselect: false,
    getOptionById () {
        return undefined;
    },
    getOptionsMatchingValue () {
        return [];
    },
    registerOption () {
        return ()=>undefined;
    },
    selectedOptions: [],
    onOptionClick () {
    // noop
    },
    onActiveDescendantChange () {
    // noop
    },
    selectOption () {
    // noop
    },
    setActiveOption () {
    // noop
    }
};
const ListboxContext = (0, _reactcontextselector.createContext)(undefined);
const useListboxContext_unstable = (selector)=>(0, _reactcontextselector.useContextSelector)(ListboxContext, (ctx = listboxContextDefaultValue)=>selector(ctx));
const ListboxProvider = ListboxContext.Provider;
