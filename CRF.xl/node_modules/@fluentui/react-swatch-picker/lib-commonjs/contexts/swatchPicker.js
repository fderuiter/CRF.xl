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
    SwatchPickerProvider: function() {
        return SwatchPickerProvider;
    },
    swatchPickerContextDefaultValue: function() {
        return swatchPickerContextDefaultValue;
    },
    useSwatchPickerContextValue_unstable: function() {
        return useSwatchPickerContextValue_unstable;
    }
});
const _reactcontextselector = require("@fluentui/react-context-selector");
const swatchPickerContextDefaultValue = {
    requestSelectionChange: ()=>{
    /*noop*/ },
    isGrid: false,
    size: 'medium',
    shape: 'square',
    spacing: 'medium',
    selectedValue: undefined
};
const SwatchPickerContext = (0, _reactcontextselector.createContext)(undefined);
const SwatchPickerProvider = SwatchPickerContext.Provider;
const useSwatchPickerContextValue_unstable = (selector)=>(0, _reactcontextselector.useContextSelector)(SwatchPickerContext, (ctx = swatchPickerContextDefaultValue)=>selector(ctx));
