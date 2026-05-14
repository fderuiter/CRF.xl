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
    get AsyncFocusSources () {
        return AsyncFocusSources;
    },
    get DeloserStrategies () {
        return DeloserStrategies;
    },
    get FOCUSABLE_SELECTOR () {
        return FOCUSABLE_SELECTOR;
    },
    get GroupperMoveFocusActions () {
        return GroupperMoveFocusActions;
    },
    get GroupperTabbabilities () {
        return GroupperTabbabilities;
    },
    get MoverDirections () {
        return MoverDirections;
    },
    get MoverKeys () {
        return MoverKeys;
    },
    get ObservedElementAccessibilities () {
        return ObservedElementAccessibilities;
    },
    get ObservedElementFailureReasons () {
        return ObservedElementFailureReasons;
    },
    get ObservedElementRequestStatuses () {
        return ObservedElementRequestStatuses;
    },
    get RestoreFocusOrders () {
        return RestoreFocusOrders;
    },
    get RestorerTypes () {
        return RestorerTypes;
    },
    get SysDummyInputsPositions () {
        return SysDummyInputsPositions;
    },
    get TABSTER_ATTRIBUTE_NAME () {
        return TABSTER_ATTRIBUTE_NAME;
    },
    get TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME () {
        return TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME;
    },
    get Visibilities () {
        return Visibilities;
    }
});
const TABSTER_ATTRIBUTE_NAME = "data-tabster";
const TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME = "data-tabster-dummy";
const FOCUSABLE_SELECTOR = `:is(${[
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "*[tabindex]",
    "*[contenteditable]",
    "details > summary",
    "audio[controls]",
    "video[controls]"
].join(", ")}):not(:disabled)`;
const AsyncFocusSources = {
    EscapeGroupper: 1,
    Restorer: 2,
    Deloser: 3
};
const ObservedElementAccessibilities = {
    Any: 0,
    Accessible: 1,
    Focusable: 2
};
const ObservedElementRequestStatuses = {
    Waiting: 0,
    Succeeded: 1,
    Canceled: 2,
    TimedOut: 3
};
const ObservedElementFailureReasons = {
    CanceledFocusChange: 1,
    TimeoutElementNotInDOM: 2,
    TimeoutElementNotAccessible: 3,
    TimeoutElementNotFocusable: 4,
    TimeoutElementNotReady: 5,
    SupersededByNewRequest: 6,
    FocusCallFailed: 7
};
const RestoreFocusOrders = {
    History: 0,
    DeloserDefault: 1,
    RootDefault: 2,
    DeloserFirst: 3,
    RootFirst: 4
};
const DeloserStrategies = {
    /**
     * If the focus is lost, the focus will be restored automatically using all available focus history.
     * This is the default strategy.
     */ Auto: 0,
    /**
     * If the focus is lost from this Deloser instance, the focus will not be restored automatically.
     * The application might listen to the event and restore the focus manually.
     * But if it is lost from another Deloser instance, the history of this Deloser could be used finding
     * the element to focus.
     */ Manual: 1
};
const Visibilities = {
    Invisible: 0,
    PartiallyVisible: 1,
    Visible: 2
};
const RestorerTypes = {
    Source: 0,
    Target: 1
};
const MoverDirections = {
    Both: 0,
    Vertical: 1,
    Horizontal: 2,
    Grid: 3,
    GridLinear: 4
};
const MoverKeys = {
    ArrowUp: 1,
    ArrowDown: 2,
    ArrowLeft: 3,
    ArrowRight: 4,
    PageUp: 5,
    PageDown: 6,
    Home: 7,
    End: 8
};
const GroupperTabbabilities = {
    Unlimited: 0,
    Limited: 1,
    LimitedTrapFocus: 2
};
const GroupperMoveFocusActions = {
    Enter: 1,
    Escape: 2
};
const SysDummyInputsPositions = {
    Auto: 0,
    Inside: 1,
    Outside: 2
}; //# sourceMappingURL=Consts.js.map
