'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDataGridHeader_unstable", {
    enumerable: true,
    get: function() {
        return useDataGridHeader_unstable;
    }
});
const _useTableHeader = require("../TableHeader/useTableHeader");
const useDataGridHeader_unstable = (props, ref)=>{
    return (0, _useTableHeader.useTableHeader_unstable)({
        ...props,
        as: 'div'
    }, ref);
};
