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
    ListItemActionEventName: function() {
        return ListItemActionEventName;
    },
    createListItemActionEvent: function() {
        return createListItemActionEvent;
    }
});
const ListItemActionEventName = 'ListItemAction';
const createListItemActionEvent = (originalEvent)=>new CustomEvent(ListItemActionEventName, {
        cancelable: true,
        bubbles: true,
        detail: {
            originalEvent
        }
    });
