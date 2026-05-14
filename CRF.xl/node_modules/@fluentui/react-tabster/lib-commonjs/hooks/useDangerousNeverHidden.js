"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DangerousNeverHiddenAttribute: function() {
        return DangerousNeverHiddenAttribute;
    },
    useDangerousNeverHidden_unstable: function() {
        return useDangerousNeverHidden_unstable;
    }
});
const DangerousNeverHiddenAttribute = 'data-tabster-never-hide';
const DangerousNeverHiddenPropObject = {
    [DangerousNeverHiddenAttribute]: ''
};
function useDangerousNeverHidden_unstable() {
    return DangerousNeverHiddenPropObject;
}
