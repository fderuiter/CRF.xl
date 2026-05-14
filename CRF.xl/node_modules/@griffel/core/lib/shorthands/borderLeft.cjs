"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "borderLeft", {
    enumerable: true,
    get: function() {
        return borderLeft;
    }
});
const _utils = require("./utils.cjs");
function borderLeft(...values) {
    if ((0, _utils.isBorderStyle)(values[0])) {
        return {
            borderLeftStyle: values[0],
            ...values[1] && {
                borderLeftWidth: values[1]
            },
            ...values[2] && {
                borderLeftColor: values[2]
            }
        };
    }
    return {
        borderLeftWidth: values[0],
        ...values[1] && {
            borderLeftStyle: values[1]
        },
        ...values[2] && {
            borderLeftColor: values[2]
        }
    };
} //# sourceMappingURL=borderLeft.js.map
