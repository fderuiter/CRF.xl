'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDataGridContextValues_unstable", {
    enumerable: true,
    get: function() {
        return useDataGridContextValues_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useTableContextValues = require("../Table/useTableContextValues");
function useDataGridContextValues_unstable(state) {
    const tableContextValues = (0, _useTableContextValues.useTableContextValues_unstable)(state);
    const { tableState, focusMode, selectableRows, subtleSelection, selectionAppearance, resizableColumns, compositeRowTabsterAttribute } = state;
    const dataGrid = _react.useMemo(()=>({
            ...tableState,
            focusMode,
            selectableRows,
            subtleSelection,
            selectionAppearance,
            resizableColumns,
            compositeRowTabsterAttribute
        }), [
        tableState,
        focusMode,
        selectableRows,
        subtleSelection,
        selectionAppearance,
        resizableColumns,
        compositeRowTabsterAttribute
    ]);
    return {
        ...tableContextValues,
        dataGrid
    };
}
