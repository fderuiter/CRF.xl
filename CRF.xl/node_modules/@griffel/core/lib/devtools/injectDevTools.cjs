"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "injectDevTools", {
    enumerable: true,
    get: function() {
        return injectDevTools;
    }
});
const _constants = require("../constants.cjs");
const _mergeDebugSequence = require("./mergeDebugSequence.cjs");
function injectDevTools(document) {
    const window = document.defaultView;
    if (!window || window.__GRIFFEL_DEVTOOLS__) {
        return;
    }
    const devtools = {
        getInfo: (element)=>{
            let rootDebugSequenceHash;
            let rootResetDebugClassName;
            for (const className of element.classList){
                if (className.startsWith(_constants.SEQUENCE_PREFIX)) {
                    rootDebugSequenceHash = className;
                }
                if (_constants.DEBUG_RESET_CLASSES[className]) {
                    rootResetDebugClassName = className;
                }
            }
            return (0, _mergeDebugSequence.mergeDebugSequence)(rootDebugSequenceHash, rootResetDebugClassName);
        }
    };
    Object.defineProperty(window, '__GRIFFEL_DEVTOOLS__', {
        configurable: false,
        enumerable: false,
        get () {
            return devtools;
        }
    });
} //# sourceMappingURL=injectDevTools.js.map
