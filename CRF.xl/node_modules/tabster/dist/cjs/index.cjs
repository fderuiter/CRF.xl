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
    get EventsTypes () {
        return _EventsTypes;
    },
    get Types () {
        return _Types;
    },
    get createTabster () {
        return _Tabster.createTabster;
    },
    get disposeTabster () {
        return _Tabster.disposeTabster;
    },
    get forceCleanup () {
        return _Tabster.forceCleanup;
    },
    get getCrossOrigin () {
        return _getCrossOrigin.getCrossOrigin;
    },
    get getDeloser () {
        return _getDeloser.getDeloser;
    },
    get getDummyInputContainer () {
        return _DummyInput.getDummyInputContainer;
    },
    get getGroupper () {
        return _getGroupper.getGroupper;
    },
    get getInternal () {
        return _Tabster.getInternal;
    },
    get getModalizer () {
        return _getModalizer.getModalizer;
    },
    get getMover () {
        return _getMover.getMover;
    },
    get getObservedElement () {
        return _getObservedElement.getObservedElement;
    },
    get getOutline () {
        return _getOutline.getOutline;
    },
    get getRestorer () {
        return _getRestorer.getRestorer;
    },
    get getShadowDOMAPI () {
        return _Tabster.getShadowDOMAPI;
    },
    get getTabster () {
        return _Tabster.getTabster;
    },
    get isNoOp () {
        return _Tabster.isNoOp;
    },
    get makeNoOp () {
        return _Tabster.makeNoOp;
    }
});
const _Tabster = require("./Tabster.cjs");
const _DummyInput = require("./DummyInput.cjs");
const _getCrossOrigin = require("./get/getCrossOrigin.cjs");
const _getDeloser = require("./get/getDeloser.cjs");
const _getGroupper = require("./get/getGroupper.cjs");
const _getModalizer = require("./get/getModalizer.cjs");
const _getMover = require("./get/getMover.cjs");
const _getObservedElement = require("./get/getObservedElement.cjs");
const _getOutline = require("./get/getOutline.cjs");
const _getRestorer = require("./get/getRestorer.cjs");
_export_star(require("./AttributeHelpers.cjs"), exports);
const _Types = /*#__PURE__*/ _interop_require_wildcard(require("./Types.cjs"));
_export_star(require("./Events.cjs"), exports);
const _EventsTypes = /*#__PURE__*/ _interop_require_wildcard(require("./EventsTypes.cjs"));
_export_star(require("./Consts.cjs"), exports);
_export_star(require("./Deprecated.cjs"), exports);
function _export_star(from, to) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
 //# sourceMappingURL=index.js.map
