'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useComboboxPositioning", {
    enumerable: true,
    get: function() {
        return useComboboxPositioning;
    }
});
const _reactpositioning = require("@fluentui/react-positioning");
function useComboboxPositioning(props) {
    const { positioning } = props;
    // Set a default set of fallback positions to try if the dropdown does not fit on screen
    const fallbackPositions = [
        'above',
        'after',
        'after-top',
        'before',
        'before-top'
    ];
    // popper options
    const popperOptions = {
        position: 'below',
        align: 'start',
        offset: {
            crossAxis: 0,
            mainAxis: 2
        },
        fallbackPositions,
        matchTargetSize: 'width',
        autoSize: true,
        ...(0, _reactpositioning.resolvePositioningShorthand)(positioning)
    };
    const { targetRef, containerRef } = (0, _reactpositioning.usePositioning)(popperOptions);
    return [
        containerRef,
        targetRef
    ];
}
