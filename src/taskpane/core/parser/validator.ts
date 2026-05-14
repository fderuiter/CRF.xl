import { StudyDesign } from '../types';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number;
}

export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                // 1. Referential Integrity (Codelists)
                if (item.dataType === 'Codelist' && item.codelistId) {
                    if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Item references missing Codelist '${item.codelistId}'`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: (item as any).rowIndex
                        });
                    }
                }

                // 2. SAS Constraints (Regulatory)
                if (item.sdtmMapping?.sasLabel && item.sdtmMapping.sasLabel.length > 40) {
                    issues.push({
                        level: 'Warning',
                        message: 'SAS Label exceeds 40 character limit.',
                        location: `${form.formName} > ${item.name}`,
                        rowIndex: (item as any).rowIndex
                    });
                }
            });
        });
    });

    return issues;
}
