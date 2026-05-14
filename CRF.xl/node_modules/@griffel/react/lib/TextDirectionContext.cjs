'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get TextDirectionProvider () {
        return TextDirectionProvider;
    },
    get useTextDirection () {
        return useTextDirection;
    }
});
const _jsxruntime = require("react/jsx-runtime");
const _react = require("react");
/**
 * @private
 */ const TextDirectionContext = /*#__PURE__*/ (0, _react.createContext)('ltr');
const TextDirectionProvider = ({ children, dir })=>{
    return (0, _jsxruntime.jsx)(TextDirectionContext.Provider, {
        value: dir,
        children: children
    });
};
function useTextDirection() {
    return (0, _react.useContext)(TextDirectionContext);
} //# sourceMappingURL=TextDirectionContext.js.map
