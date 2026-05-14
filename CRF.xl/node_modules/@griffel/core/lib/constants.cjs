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
    get DATA_BUCKET_ATTR () {
        return DATA_BUCKET_ATTR;
    },
    get DATA_PRIORITY_ATTR () {
        return DATA_PRIORITY_ATTR;
    },
    get DEBUG_RESET_CLASSES () {
        return DEBUG_RESET_CLASSES;
    },
    get DEBUG_SEQUENCE_SEPARATOR () {
        return DEBUG_SEQUENCE_SEPARATOR;
    },
    get DEFINITION_LOOKUP_TABLE () {
        return DEFINITION_LOOKUP_TABLE;
    },
    get HASH_PREFIX () {
        return HASH_PREFIX;
    },
    get LOOKUP_DEFINITIONS_INDEX () {
        return LOOKUP_DEFINITIONS_INDEX;
    },
    get LOOKUP_DIR_INDEX () {
        return LOOKUP_DIR_INDEX;
    },
    get RESET () {
        return RESET;
    },
    get RESET_HASH_PREFIX () {
        return RESET_HASH_PREFIX;
    },
    get SEQUENCE_HASH_LENGTH () {
        return SEQUENCE_HASH_LENGTH;
    },
    get SEQUENCE_PREFIX () {
        return SEQUENCE_PREFIX;
    },
    get SEQUENCE_SIZE () {
        return SEQUENCE_SIZE;
    },
    get UNSUPPORTED_CSS_PROPERTIES () {
        return UNSUPPORTED_CSS_PROPERTIES;
    }
});
// ----
// Heads up!
// These constants are global and will be shared between Griffel instances.
// Any change in them should happen only in a MAJOR version. If it happens,
// please change "__NAMESPACE_PREFIX__" to include a version.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __GLOBAL__ = typeof window === 'undefined' ? global : window;
const __NAMESPACE_PREFIX__ = '@griffel/';
function getGlobalVar(name, defaultValue) {
    if (!__GLOBAL__[Symbol.for(__NAMESPACE_PREFIX__ + name)]) {
        __GLOBAL__[Symbol.for(__NAMESPACE_PREFIX__ + name)] = defaultValue;
    }
    return __GLOBAL__[Symbol.for(__NAMESPACE_PREFIX__ + name)];
}
const DEBUG_RESET_CLASSES = /*#__PURE__*/ getGlobalVar('DEBUG_RESET_CLASSES', {});
const DEFINITION_LOOKUP_TABLE = /*#__PURE__*/ getGlobalVar('DEFINITION_LOOKUP_TABLE', {});
const DATA_BUCKET_ATTR = 'data-make-styles-bucket';
const DATA_PRIORITY_ATTR = 'data-priority';
const HASH_PREFIX = 'f';
const RESET_HASH_PREFIX = 'r';
const SEQUENCE_HASH_LENGTH = 7;
const SEQUENCE_PREFIX = '___';
const DEBUG_SEQUENCE_SEPARATOR = '_';
const SEQUENCE_SIZE = process.env.NODE_ENV === 'production' ? SEQUENCE_PREFIX.length + SEQUENCE_HASH_LENGTH : SEQUENCE_PREFIX.length + SEQUENCE_HASH_LENGTH + DEBUG_SEQUENCE_SEPARATOR.length + SEQUENCE_HASH_LENGTH;
const LOOKUP_DEFINITIONS_INDEX = 0;
const LOOKUP_DIR_INDEX = 1;
const UNSUPPORTED_CSS_PROPERTIES = {
    all: 1,
    borderColor: 1,
    borderStyle: 1,
    borderWidth: 1,
    borderBlock: 1,
    borderBlockEnd: 1,
    borderBlockStart: 1,
    borderInline: 1,
    borderInlineEnd: 1,
    borderInlineStart: 1
};
const RESET = 'DO_NOT_USE_DIRECTLY: @griffel/reset-value'; //# sourceMappingURL=constants.js.map
