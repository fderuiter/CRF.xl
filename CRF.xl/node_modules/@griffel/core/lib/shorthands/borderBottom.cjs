"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderBottom", {
    enumerable: true,
    get: function() {
        return borderBottom;
    }
});
const _utils = require("./utils.cjs");
function borderBottom(...values) {
    if ((0, _utils.isBorderStyle)(values[0])) {
        return {
            borderBottomStyle: values[0],
            ...values[1] && {
                borderBottomWidth: values[1]
            },
            ...values[2] && {
                borderBottomColor: values[2]
            }
        };
    }
    return {
        borderBottomWidth: values[0],
        ...values[1] && {
            borderBottomStyle: values[1]
        },
        ...values[2] && {
            borderBottomColor: values[2]
        }
    };
} //# sourceMappingURL=borderBottom.js.map
