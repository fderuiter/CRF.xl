import { StudyDesign } from '../types';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number;
}

export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Visit Schedule Integrity
    study.events.forEach(event => {
        event.forms.forEach(fRef => {
            if (!study.forms[fRef.formOid]) {
                issues.push({
                    level: 'Error',
                    message: `Event '${event.eventName}' references non-existent Form: ${fRef.formOid}`,
                    location: `Events > ${event.eventName}`
                });
            }
        });
    });

    // 2. Metadata & Codelist Links
    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.dataType === 'Codelist' && item.codelistId) {
                    if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Missing Codelist definition for '${item.codelistId}'`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: (item as any).rowIndex
                        });
                    }
                }
                if (item.sdtmMapping?.sasLabel && item.sdtmMapping.sasLabel.length > 40) {
                    issues.push({
                        level: 'Warning',
                        message: 'SAS Label is over 40 characters.',
                        location: `${form.formName} > ${item.name}`,
                        rowIndex: (item as any).rowIndex
                    });
                }
            });
        });
    });

    return issues;
}
