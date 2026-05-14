/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */ /**
 * Events sent by Tabster.
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
    get DeloserFocusLostEvent () {
        return DeloserFocusLostEvent;
    },
    get DeloserFocusLostEventName () {
        return DeloserFocusLostEventName;
    },
    get DeloserRestoreFocusEvent () {
        return DeloserRestoreFocusEvent;
    },
    get DeloserRestoreFocusEventName () {
        return DeloserRestoreFocusEventName;
    },
    get GroupperMoveFocusEvent () {
        return GroupperMoveFocusEvent;
    },
    get GroupperMoveFocusEventName () {
        return GroupperMoveFocusEventName;
    },
    get ModalizerActiveEvent () {
        return ModalizerActiveEvent;
    },
    get ModalizerActiveEventName () {
        return ModalizerActiveEventName;
    },
    get ModalizerFocusInEventName () {
        return ModalizerFocusInEventName;
    },
    get ModalizerFocusOutEventName () {
        return ModalizerFocusOutEventName;
    },
    get ModalizerInactiveEvent () {
        return ModalizerInactiveEvent;
    },
    get ModalizerInactiveEventName () {
        return ModalizerInactiveEventName;
    },
    get MoverMemorizedElementEvent () {
        return MoverMemorizedElementEvent;
    },
    get MoverMemorizedElementEventName () {
        return MoverMemorizedElementEventName;
    },
    get MoverMoveFocusEvent () {
        return MoverMoveFocusEvent;
    },
    get MoverMoveFocusEventName () {
        return MoverMoveFocusEventName;
    },
    get MoverStateEvent () {
        return MoverStateEvent;
    },
    get MoverStateEventName () {
        return MoverStateEventName;
    },
    get RestorerRestoreFocusEvent () {
        return RestorerRestoreFocusEvent;
    },
    get RestorerRestoreFocusEventName () {
        return RestorerRestoreFocusEventName;
    },
    get RootBlurEvent () {
        return RootBlurEvent;
    },
    get RootBlurEventName () {
        return RootBlurEventName;
    },
    get RootFocusEvent () {
        return RootFocusEvent;
    },
    get RootFocusEventName () {
        return RootFocusEventName;
    },
    get TabsterCustomEvent () {
        return TabsterCustomEvent;
    },
    get TabsterFocusInEvent () {
        return TabsterFocusInEvent;
    },
    get TabsterFocusInEventName () {
        return TabsterFocusInEventName;
    },
    get TabsterFocusOutEvent () {
        return TabsterFocusOutEvent;
    },
    get TabsterFocusOutEventName () {
        return TabsterFocusOutEventName;
    },
    get TabsterMoveFocusEvent () {
        return TabsterMoveFocusEvent;
    },
    get TabsterMoveFocusEventName () {
        return TabsterMoveFocusEventName;
    }
});
const TabsterFocusInEventName = "tabster:focusin";
const TabsterFocusOutEventName = "tabster:focusout";
const TabsterMoveFocusEventName = "tabster:movefocus";
const DeloserFocusLostEventName = "tabster:deloser:focus-lost";
const DeloserRestoreFocusEventName = "tabster:deloser:restore-focus";
const ModalizerActiveEventName = "tabster:modalizer:active";
const ModalizerInactiveEventName = "tabster:modalizer:inactive";
const ModalizerFocusInEventName = "tabster:modalizer:focusin";
const ModalizerFocusOutEventName = "tabster:modalizer:focusout";
const MoverStateEventName = "tabster:mover:state";
const MoverMoveFocusEventName = "tabster:mover:movefocus";
const MoverMemorizedElementEventName = "tabster:mover:memorized-element";
const GroupperMoveFocusEventName = "tabster:groupper:movefocus";
const RestorerRestoreFocusEventName = "tabster:restorer:restore-focus";
const RootFocusEventName = "tabster:root:focus";
const RootBlurEventName = "tabster:root:blur";
// Node.js environments do not have CustomEvent and it is needed for the events to be
// evaluated. It doesn't matter if it works or not in Node.js environment.
// So, we just need to make sure that it doesn't throw undefined reference.
const CustomEvent_ = typeof CustomEvent !== "undefined" ? CustomEvent : function() {
/* no-op */ };
class TabsterCustomEvent extends CustomEvent_ {
    /**
     * @deprecated use `detail`.
     */ details;
    constructor(type, detail){
        super(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail
        });
        this.details = detail;
    }
}
class TabsterFocusInEvent extends TabsterCustomEvent {
    constructor(detail){
        super(TabsterFocusInEventName, detail);
    }
}
class TabsterFocusOutEvent extends TabsterCustomEvent {
    constructor(detail){
        super(TabsterFocusOutEventName, detail);
    }
}
class TabsterMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail){
        super(TabsterMoveFocusEventName, detail);
    }
}
class MoverStateEvent extends TabsterCustomEvent {
    constructor(detail){
        super(MoverStateEventName, detail);
    }
}
class MoverMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail){
        super(MoverMoveFocusEventName, detail);
    }
}
class MoverMemorizedElementEvent extends TabsterCustomEvent {
    constructor(detail){
        super(MoverMemorizedElementEventName, detail);
    }
}
class GroupperMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail){
        super(GroupperMoveFocusEventName, detail);
    }
}
class ModalizerActiveEvent extends TabsterCustomEvent {
    constructor(detail){
        super(ModalizerActiveEventName, detail);
    }
}
class ModalizerInactiveEvent extends TabsterCustomEvent {
    constructor(detail){
        super(ModalizerInactiveEventName, detail);
    }
}
class DeloserFocusLostEvent extends TabsterCustomEvent {
    constructor(detail){
        super(DeloserFocusLostEventName, detail);
    }
}
class DeloserRestoreFocusEvent extends TabsterCustomEvent {
    constructor(){
        super(DeloserRestoreFocusEventName);
    }
}
class RestorerRestoreFocusEvent extends TabsterCustomEvent {
    constructor(){
        super(RestorerRestoreFocusEventName);
    }
}
class RootFocusEvent extends TabsterCustomEvent {
    constructor(detail){
        super(RootFocusEventName, detail);
    }
}
class RootBlurEvent extends TabsterCustomEvent {
    constructor(detail){
        super(RootBlurEventName, detail);
    }
} //# sourceMappingURL=Events.js.map
