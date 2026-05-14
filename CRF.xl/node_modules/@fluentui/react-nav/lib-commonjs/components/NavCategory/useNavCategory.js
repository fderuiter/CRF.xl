'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useNavCategory_unstable", {
    enumerable: true,
    get: function() {
        return useNavCategory_unstable;
    }
});
const _NavContext = require("../NavContext");
const useNavCategory_unstable = (props, ref)=>{
    const { value, children } = props;
    const { openCategories } = (0, _NavContext.useNavContext_unstable)();
    const open = openCategories === null || openCategories === void 0 ? void 0 : openCategories.includes(value);
    return {
        open,
        value,
        children: children !== null && children !== void 0 ? children : null
    };
};
