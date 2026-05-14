'use client';
import { getModalizer, getRestorer, RestorerTypes } from 'tabster';
import { useId } from '@fluentui/react-utilities';
import { useTabsterAttributes } from './useTabsterAttributes';
import { useTabster } from './useTabster';
import { DangerousNeverHiddenAttribute } from './useDangerousNeverHidden';
const tabsterAccessibleCheck = (element)=>{
    return element.hasAttribute(DangerousNeverHiddenAttribute);
};
function initTabsterModules(tabster) {
    getModalizer(tabster, undefined, tabsterAccessibleCheck);
    getRestorer(tabster);
}
/**
 * Applies modal dialog behaviour through DOM attributes
 * Modal element will focus trap and hide other content on the page
 * The trigger element will be focused if focus is lost after the modal element is removed
 *
 * @returns DOM attributes to apply to the modal element and its trigger
 */ export const useModalAttributes = (options = {})=>{
    const { trapFocus, alwaysFocusable, legacyTrapFocus } = options;
    // Initializes the modalizer and restorer APIs
    useTabster(initTabsterModules);
    const id = useId('modal-', options.id);
    const modalAttributes = useTabsterAttributes({
        restorer: {
            type: RestorerTypes.Source
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
    const triggerAttributes = useTabsterAttributes({
        restorer: {
            type: RestorerTypes.Target
        }
    });
    return {
        modalAttributes,
        triggerAttributes
    };
};
