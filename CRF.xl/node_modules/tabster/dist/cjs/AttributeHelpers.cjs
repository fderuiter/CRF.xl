/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ "use strict";
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
    get getTabsterAttribute () {
        return getTabsterAttribute;
    },
    get mergeTabsterProps () {
        return mergeTabsterProps;
    },
    get setTabsterAttribute () {
        return setTabsterAttribute;
    }
});
const _Consts = require("./Consts.cjs");
function getTabsterAttribute(props, plain) {
    const attr = JSON.stringify(props);
    if (plain === true) {
        return attr;
    }
    return {
        [_Consts.TABSTER_ATTRIBUTE_NAME]: attr
    };
}
function mergeTabsterProps(props, newProps) {
    for (const key of Object.keys(newProps)){
        const value = newProps[key];
        if (value) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props[key] = value;
        } else {
            delete props[key];
        }
    }
}
function setTabsterAttribute(element, newProps, update) {
    let props;
    if (update) {
        const attr = element.getAttribute(_Consts.TABSTER_ATTRIBUTE_NAME);
        if (attr) {
            try {
                props = JSON.parse(attr);
            } catch (e) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`data-tabster attribute error: ${e}`, element);
                }
            }
        }
    }
    if (!props) {
        props = {};
    }
    mergeTabsterProps(props, newProps);
    if (Object.keys(props).length > 0) {
        element.setAttribute(_Consts.TABSTER_ATTRIBUTE_NAME, getTabsterAttribute(props, true));
    } else {
        element.removeAttribute(_Consts.TABSTER_ATTRIBUTE_NAME);
    }
} //# sourceMappingURL=AttributeHelpers.js.map
