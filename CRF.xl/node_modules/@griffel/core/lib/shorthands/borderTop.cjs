"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderTop", {
    enumerable: true,
    get: function() {
        return borderTop;
    }
});
const _utils = require("./utils.cjs");
function borderTop(...values) {
    if ((0, _utils.isBorderStyle)(values[0])) {
        return {
            borderTopStyle: values[0],
            ...values[1] && {
                borderTopWidth: values[1]
            },
            ...values[2] && {
                borderTopColor: values[2]
            }
        };
    }
    return {
        borderTopWidth: values[0],
        ...values[1] && {
            borderTopStyle: values[1]
        },
        ...values[2] && {
            borderTopColor: values[2]
        }
    };
} //# sourceMappingURL=borderTop.js.map
