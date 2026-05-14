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
    get reduceToClassName () {
        return reduceToClassName;
    },
    get reduceToClassNameForSlots () {
        return reduceToClassNameForSlots;
    }
});
const _constants = require("../constants.cjs");
const _hashSequence = require("./utils/hashSequence.cjs");
function reduceToClassName(classMap, dir) {
    // - `classString` is a string of classnames separated by a space, used to output classes
    // - `hashString` is a string of classnames separated by a space, used to generate a hash
    //
    // `hashString` is needed to handle `null` values in a class map as they don't produce any classes.
    let classString = '';
    let hashString = '';
    // eslint-disable-next-line guard-for-in
    for(const propertyHash in classMap){
        const classNameMapping = classMap[propertyHash];
        if (classNameMapping === 0) {
            hashString += propertyHash + ' ';
            continue;
        }
        const hasRTLClassName = Array.isArray(classNameMapping);
        const className = dir === 'rtl' ? (hasRTLClassName ? classNameMapping[1] : classNameMapping) + ' ' : (hasRTLClassName ? classNameMapping[0] : classNameMapping) + ' ';
        classString += className;
        hashString += className;
    }
    return [
        classString.slice(0, -1),
        hashString.slice(0, -1)
    ];
}
function reduceToClassNameForSlots(classesMapBySlot, dir) {
    const classNamesForSlots = {};
    // eslint-disable-next-line guard-for-in
    for(const slotName in classesMapBySlot){
        const [slotClasses, slotClassesHash] = reduceToClassName(classesMapBySlot[slotName], dir);
        // Handles a case when there are no classes in a set i.e. "makeStyles({ root: {} })"
        if (slotClassesHash === '') {
            classNamesForSlots[slotName] = '';
            continue;
        }
        const sequenceHash = (0, _hashSequence.hashSequence)(slotClassesHash, dir);
        const resultSlotClasses = sequenceHash + (slotClasses === '' ? '' : ' ' + slotClasses);
        _constants.DEFINITION_LOOKUP_TABLE[sequenceHash] = [
            classesMapBySlot[slotName],
            dir
        ];
        classNamesForSlots[slotName] = resultSlotClasses;
    }
    return classNamesForSlots;
} //# sourceMappingURL=reduceToClassNameForSlots.js.map
