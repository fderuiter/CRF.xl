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
    get debugData () {
        return _store.debugData;
    },
    get getSourceURLfromError () {
        return _getSourceURLfromError.getSourceURLfromError;
    },
    get injectDevTools () {
        return _injectDevTools.injectDevTools;
    },
    get isDevToolsEnabled () {
        return _isDevToolsEnabled.isDevToolsEnabled;
    }
});
const _injectDevTools = require("./injectDevTools.cjs");
const _isDevToolsEnabled = require("./isDevToolsEnabled.cjs");
const _store = require("./store.cjs");
const _getSourceURLfromError = require("./getSourceURLfromError.cjs");
 //# sourceMappingURL=index.js.map
