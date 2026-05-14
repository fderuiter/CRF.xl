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
    CarouselProvider: function() {
        return CarouselProvider;
    },
    carouselContextDefaultValue: function() {
        return carouselContextDefaultValue;
    },
    useCarouselContext_unstable: function() {
        return useCarouselContext_unstable;
    }
});
const _reactcontextselector = require("@fluentui/react-context-selector");
const _createCarouselStore = require("./createCarouselStore");
const carouselContextDefaultValue = {
    store: (0, _createCarouselStore.createCarouselStore)(),
    value: null,
    selectPageByDirection: ()=>{
    /** noop */ },
    selectPageByValue: ()=>{
    /** noop */ }
};
const CarouselContext = (0, _reactcontextselector.createContext)(undefined);
const CarouselProvider = CarouselContext.Provider;
const useCarouselContext_unstable = (selector)=>(0, _reactcontextselector.useContextSelector)(CarouselContext, (ctx = carouselContextDefaultValue)=>selector(ctx));
