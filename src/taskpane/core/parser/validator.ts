import { StudyDesign } from '../types';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number;
}

export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check Codelist References
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.dataType === 'Codelist' && item.codelistId) {
                    if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Missing Codelist '${item.codelistId}' referenced by ${item.name}`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: (item as any).rowIndex
                        });
                    }
                }
            });
        });
    });

    // Check Empty Events
    study.events.forEach(event => {
        if (event.forms.length === 0) {
            issues.push({ level: 'Warning', message: `Event '${event.eventName}' has no forms assigned.` });
        }
    });

    return issues;
}
