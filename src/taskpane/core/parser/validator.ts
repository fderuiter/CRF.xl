import { StudyDesign } from '../types';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
}

/**
 * Performs referential integrity and business rule validation on the parsed study.
 */
export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Check Codelist References
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.dataType === 'Codelist' && item.codelistId) {
                    if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Item '${item.name}' references missing Codelist ID: ${item.codelistId}`,
                            location: `Form: ${form.formName} > Group: ${group.name}`
                        });
                    }
                }
            });
        });
    });

    // 2. Check Event/Form Sequencing
    study.events.forEach(event => {
        if (event.forms.length === 0) {
            issues.push({
                level: 'Warning',
                message: `Event '${event.eventName}' has no forms assigned.`,
                location: `Event: ${event.eventOid}`
            });
        }
    });

    return issues;
}
