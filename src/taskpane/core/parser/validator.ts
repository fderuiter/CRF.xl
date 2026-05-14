import { StudyDesign } from '../types/index';

export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number;
    sheetName?: string; // Tracks which tab the error lives on
}

export function validateStudyDesign(study: StudyDesign, activeSheetFilter?: string): ValidationIssue[] {
    let issues: ValidationIssue[] = [];

    // 1. Validate Schedule (_Schedule sheet)
    study.events.forEach(event => {
        event.forms.forEach(fRef => {
            if (!study.forms[fRef.formOid]) {
                issues.push({
                    level: 'Error',
                    message: `Visit '${event.eventName}' schedules a form that doesn't exist: '${fRef.formOid}'`,
                    location: `_Schedule > ${event.eventName}`,
                    sheetName: "_Schedule"
                });
            }
        });
    });

    // 2. Validate CRF Forms (Individual tabs)
    const globalVariables = new Set<string>();

    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            group.items.forEach(item => {
                const row = (item as any).rowIndex;
                const sheet = form.formOid;

                // Check Missing Variables
                if (!item.itemOid) {
                    issues.push({ level: 'Error', message: 'Missing Variable Name.', location: `${sheet} > Row ${row}`, rowIndex: row, sheetName: sheet });
                }

                // Check Codelist References
                if (item.dataType === 'codelist' || item.codelistId) {
                    if (!item.codelistId) {
                        issues.push({ level: 'Error', message: `Type is Codelist, but ID is blank.`, location: `${sheet} > ${item.itemOid || 'Row '+row}`, rowIndex: row, sheetName: sheet });
                    } else if (!study.codelists[item.codelistId]) {
                        issues.push({ level: 'Error', message: `Codelist ID '${item.codelistId}' not found in _Codelists.`, location: `${sheet} > ${item.itemOid}`, rowIndex: row, sheetName: sheet });
                    }
                }

                // Check Duplicates
                if (item.itemOid) {
                    if (globalVariables.has(item.itemOid)) {
                        issues.push({ level: 'Error', message: `Duplicate Variable Name: '${item.itemOid}'. Must be unique across study.`, location: `${sheet} > ${item.itemOid}`, rowIndex: row, sheetName: sheet });
                    }
                    globalVariables.add(item.itemOid);
                }
            });
        });
    });

    // Contextual Filtering: If a filter is provided, only return issues for that sheet.
    // Allow system sheets to see everything, but CRF tabs only see their own errors.
    if (activeSheetFilter && !activeSheetFilter.startsWith("_")) {
        issues = issues.filter(i => i.sheetName === activeSheetFilter);
    }

    return issues;
}
