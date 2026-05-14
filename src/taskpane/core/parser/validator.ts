import { StudyDesign } from '../types/index';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number;
}

export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Plumbing Fix: Pass rowIndex for Event errors
    study.events.forEach(event => {
        event.forms.forEach(fRef => {
            if (!study.forms[fRef.formOid]) {
                issues.push({
                    level: 'Error',
                    message: `Visit refers to non-existent Form ID: '${fRef.formOid}'`,
                    location: `Events > ${event.eventName}`,
                    rowIndex: (event as any).rowIndex
                });
            }
        });
    });

    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                const row = (item as any).rowIndex;
                if (item.dataType === 'Codelist' && item.codelistId) {
                    if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Missing Codelist definition for '${item.codelistId}'`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: row
                        });
                    }
                }
                if (item.sdtmMapping?.sasLabel && item.sdtmMapping.sasLabel.length > 40) {
                    issues.push({
                        level: 'Warning', message: 'SAS Label > 40 chars',
                        location: `${form.formName} > ${item.name}`, rowIndex: row
                    });
                }
            });
        });
    });

    return issues;
}
