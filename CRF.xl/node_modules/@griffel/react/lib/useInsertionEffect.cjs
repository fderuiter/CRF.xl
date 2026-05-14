'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useInsertionEffect", {
    enumerable: true,
    get: function() {
        return useInsertionEffect;
    }
});
const _react = /*#__PURE__*/ _interop_require_default(require("react"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const useInsertionEffect = // @ts-expect-error Hack to make sure that `useInsertionEffect` will not cause bundling issues in older React versions
// eslint-disable-next-line no-useless-concat
_react.default['useInsertion' + 'Effect'] ? _react.default['useInsertion' + 'Effect'] : undefined; //# sourceMappingURL=useInsertionEffect.js.map
