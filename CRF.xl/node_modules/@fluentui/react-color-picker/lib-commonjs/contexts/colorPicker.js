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
    ColorPickerProvider: function() {
        return ColorPickerProvider;
    },
    colorPickerContextDefaultValue: function() {
        return colorPickerContextDefaultValue;
    },
    useColorPickerContextValue_unstable: function() {
        return useColorPickerContextValue_unstable;
    }
});
const _reactcontextselector = require("@fluentui/react-context-selector");
const colorPickerContextDefaultValue = {
    requestChange: ()=>{
    /*noop*/ },
    color: undefined,
    shape: 'rounded'
};
const colorPickerContext = (0, _reactcontextselector.createContext)(undefined);
const ColorPickerProvider = colorPickerContext.Provider;
const useColorPickerContextValue_unstable = (selector)=>(0, _reactcontextselector.useContextSelector)(colorPickerContext, (ctx = colorPickerContextDefaultValue)=>selector(ctx));
