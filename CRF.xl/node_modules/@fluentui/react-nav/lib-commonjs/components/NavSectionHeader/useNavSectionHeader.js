"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useNavSectionHeader_unstable", {
    enumerable: true,
    get: function() {
        return useNavSectionHeader_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useNavSectionHeader_unstable = (props, ref)=>{
    return {
        components: {
            root: 'h3'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('h3', {
            ref,
            ...props
        }), {
            elementType: 'h3'
        })
    };
};
