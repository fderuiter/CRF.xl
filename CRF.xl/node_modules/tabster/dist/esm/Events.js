/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Events sent by Tabster.
 */
export const TabsterFocusInEventName = "tabster:focusin";
export const TabsterFocusOutEventName = "tabster:focusout";
// Event is dispatched when Tabster wants to move focus as the result of
// handling keyboard event. This allows to preventDefault() if you want to have
// some custom logic.
export const TabsterMoveFocusEventName = "tabster:movefocus";
/**
 * Events sent by Deloser.
 */
export const DeloserFocusLostEventName = "tabster:deloser:focus-lost";
/**
 * Events to be sent to Deloser by the application.
 */
export const DeloserRestoreFocusEventName = "tabster:deloser:restore-focus";
/**
 * Events sent by Modalizer.
 */
export const ModalizerActiveEventName = "tabster:modalizer:active";
export const ModalizerInactiveEventName = "tabster:modalizer:inactive";
export const ModalizerFocusInEventName = "tabster:modalizer:focusin";
export const ModalizerFocusOutEventName = "tabster:modalizer:focusout";
/**
 * Events sent by Mover.
 */
export const MoverStateEventName = "tabster:mover:state";
/**
 * Events to be sent to Mover by the application.
 */
// Event that can be dispatched by the application to programmatically move
// focus inside Mover.
export const MoverMoveFocusEventName = "tabster:mover:movefocus";
// Event that can be dispatched by the application to forget or modify
// memorized element in Mover with memorizeCurrent property.
export const MoverMemorizedElementEventName = "tabster:mover:memorized-element";
/**
 * Events sent by Groupper.
 */
/**
 * Events to be sent to Groupper by the application.
 */
// Event that can be dispatched by the application to programmatically enter
// or escape Groupper.
export const GroupperMoveFocusEventName = "tabster:groupper:movefocus";
/**
 * Events sent by Restorer.
 */
export const RestorerRestoreFocusEventName = "tabster:restorer:restore-focus";
/**
 * Events sent by Root.
 */
export const RootFocusEventName = "tabster:root:focus";
export const RootBlurEventName = "tabster:root:blur";
// Node.js environments do not have CustomEvent and it is needed for the events to be
// evaluated. It doesn't matter if it works or not in Node.js environment.
// So, we just need to make sure that it doesn't throw undefined reference.
const CustomEvent_ = typeof CustomEvent !== "undefined"
    ? CustomEvent
    : function () {
        /* no-op */
    };
export class TabsterCustomEvent extends CustomEvent_ {
    /**
     * @deprecated use `detail`.
     */
    details;
    constructor(type, detail) {
        super(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail,
        });
        this.details = detail;
    }
}
export class TabsterFocusInEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(TabsterFocusInEventName, detail);
    }
}
export class TabsterFocusOutEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(TabsterFocusOutEventName, detail);
    }
}
export class TabsterMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(TabsterMoveFocusEventName, detail);
    }
}
export class MoverStateEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(MoverStateEventName, detail);
    }
}
export class MoverMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(MoverMoveFocusEventName, detail);
    }
}
export class MoverMemorizedElementEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(MoverMemorizedElementEventName, detail);
    }
}
export class GroupperMoveFocusEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(GroupperMoveFocusEventName, detail);
    }
}
export class ModalizerActiveEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(ModalizerActiveEventName, detail);
    }
}
export class ModalizerInactiveEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(ModalizerInactiveEventName, detail);
    }
}
export class DeloserFocusLostEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(DeloserFocusLostEventName, detail);
    }
}
export class DeloserRestoreFocusEvent extends TabsterCustomEvent {
    constructor() {
        super(DeloserRestoreFocusEventName);
    }
}
export class RestorerRestoreFocusEvent extends TabsterCustomEvent {
    constructor() {
        super(RestorerRestoreFocusEventName);
    }
}
export class RootFocusEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(RootFocusEventName, detail);
    }
}
export class RootBlurEvent extends TabsterCustomEvent {
    constructor(detail) {
        super(RootBlurEventName, detail);
    }
}
//# sourceMappingURL=Events.js.map