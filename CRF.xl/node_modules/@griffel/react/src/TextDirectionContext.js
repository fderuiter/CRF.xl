'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
/**
 * @private
 */
const TextDirectionContext = /*#__PURE__*/ createContext('ltr');
/**
 * @public
 */
export const TextDirectionProvider = ({ children, dir }) => {
    return _jsx(TextDirectionContext.Provider, { value: dir, children: children });
};
/**
 * Returns current directionality of the element's text.
 *
 * @private
 */
export function useTextDirection() {
    return useContext(TextDirectionContext);
}
//# sourceMappingURL=TextDirectionContext.js.map