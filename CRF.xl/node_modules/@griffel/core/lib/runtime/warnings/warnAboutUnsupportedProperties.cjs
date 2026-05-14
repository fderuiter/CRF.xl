"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "warnAboutUnsupportedProperties", {
    enumerable: true,
    get: function() {
        return warnAboutUnsupportedProperties;
    }
});
const _logError = require("./logError.cjs");
function warnAboutUnsupportedProperties(property, value) {
    const message = /*#__PURE__*/ (()=>[
            `@griffel/react: You are using unsupported shorthand CSS property "${property}". ` + `Please check your "makeStyles" calls, there *should not* be following:`,
            ' '.repeat(2) + `makeStyles({`,
            ' '.repeat(4) + `[slot]: { ${property}: "${value}" }`,
            ' '.repeat(2) + `})`,
            '',
            'Learn why CSS shorthands are not supported: https://aka.ms/griffel-css-shorthands'
        ].join('\n'))();
    (0, _logError.logError)(message);
} //# sourceMappingURL=warnAboutUnsupportedProperties.js.map
