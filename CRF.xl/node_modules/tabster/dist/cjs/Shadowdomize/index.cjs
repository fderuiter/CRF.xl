/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ // TODO: The functions below do not consider Shadow DOM slots yet. We will be adding
// support for slots as the need arises.
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
    get appendChild () {
        return _DOMFunctions.appendChild;
    },
    get createMutationObserver () {
        return _ShadowMutationObserver.createShadowMutationObserver;
    },
    get createTreeWalker () {
        return _ShadowTreeWalker.createShadowTreeWalker;
    },
    get getActiveElement () {
        return _DOMFunctions.getActiveElement;
    },
    get getElementById () {
        return _querySelector.getElementById;
    },
    get getElementsByName () {
        return _DOMFunctions.getElementsByName;
    },
    get getFirstChild () {
        return _DOMFunctions.getFirstChild;
    },
    get getFirstElementChild () {
        return _DOMFunctions.getFirstElementChild;
    },
    get getLastChild () {
        return _DOMFunctions.getLastChild;
    },
    get getLastElementChild () {
        return _DOMFunctions.getLastElementChild;
    },
    get getNextElementSibling () {
        return _DOMFunctions.getNextElementSibling;
    },
    get getNextSibling () {
        return _DOMFunctions.getNextSibling;
    },
    get getParentElement () {
        return _DOMFunctions.getParentElement;
    },
    get getParentNode () {
        return _DOMFunctions.getParentNode;
    },
    get getPreviousElementSibling () {
        return _DOMFunctions.getPreviousElementSibling;
    },
    get getPreviousSibling () {
        return _DOMFunctions.getPreviousSibling;
    },
    get getSelection () {
        return _DOMFunctions.getSelection;
    },
    get insertBefore () {
        return _DOMFunctions.insertBefore;
    },
    get nodeContains () {
        return _DOMFunctions.nodeContains;
    },
    get querySelector () {
        return _querySelector.querySelector;
    },
    get querySelectorAll () {
        return _querySelector.querySelectorAll;
    }
});
const _ShadowTreeWalker = require("./ShadowTreeWalker.cjs");
const _ShadowMutationObserver = require("./ShadowMutationObserver.cjs");
const _DOMFunctions = require("./DOMFunctions.cjs");
const _querySelector = require("./querySelector.cjs");
 //# sourceMappingURL=index.js.map
