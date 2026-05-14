"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderRight", {
    enumerable: true,
    get: function() {
        return borderRight;
    }
});
const _utils = require("./utils.cjs");
function borderRight(...values) {
    if ((0, _utils.isBorderStyle)(values[0])) {
        return {
            borderRightStyle: values[0],
            ...values[1] && {
                borderRightWidth: values[1]
            },
            ...values[2] && {
                borderRightColor: values[2]
            }
        };
    }
    return {
        borderRightWidth: values[0],
        ...values[1] && {
            borderRightStyle: values[1]
        },
        ...values[2] && {
            borderRightColor: values[2]
        }
    };
} //# sourceMappingURL=borderRight.js.map
