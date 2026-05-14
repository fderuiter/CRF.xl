'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useModalAttributes", {
    enumerable: true,
    get: function() {
        return useModalAttributes;
    }
});
const _tabster = require("tabster");
const _reactutilities = require("@fluentui/react-utilities");
const _useTabsterAttributes = require("./useTabsterAttributes");
const _useTabster = require("./useTabster");
const _useDangerousNeverHidden = require("./useDangerousNeverHidden");
const tabsterAccessibleCheck = (element)=>{
    return element.hasAttribute(_useDangerousNeverHidden.DangerousNeverHiddenAttribute);
};
function initTabsterModules(tabster) {
    (0, _tabster.getModalizer)(tabster, undefined, tabsterAccessibleCheck);
    (0, _tabster.getRestorer)(tabster);
}
const useModalAttributes = (options = {})=>{
    const { trapFocus, alwaysFocusable, legacyTrapFocus } = options;
    // Initializes the modalizer and restorer APIs
    (0, _useTabster.useTabster)(initTabsterModules);
    const id = (0, _reactutilities.useId)('modal-', options.id);
    const modalAttributes = (0, _useTabsterAttributes.useTabsterAttributes)({
        restorer: {
            type: _tabster.RestorerTypes.Source
        },
        ...trapFocus && {
            modalizer: {
                id,
                isOthersAccessible: !trapFocus,
                isAlwaysAccessible: alwaysFocusable,
                isTrapped: legacyTrapFocus && trapFocus
            }
        }
    });
    const triggerAttributes = (0, _useTabsterAttributes.useTabsterAttributes)({
        restorer: {
            type: _tabster.RestorerTypes.Target
        }
    });
    return {
        modalAttributes,
        triggerAttributes
    };
};
