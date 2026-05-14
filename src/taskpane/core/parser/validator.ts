import { StudyDesign } from '../types';

/**
 * ValidationIssue: Represents a single diagnostic finding in the study metadata.
 */
export interface ValidationIssue {
    level: 'Error' | 'Warning';
    message: string;
    location?: string;
    rowIndex?: number; // 1-based index for Excel navigation
}

/**
 * Validates the parsed StudyDesign object.
 * Enforces clinical standards, referential integrity, and regulatory constraints.
 */
export function validateStudyDesign(study: StudyDesign): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Structural Integrity: Events -> Forms
    study.events.forEach(event => {
        if (event.forms.length === 0) {
            issues.push({
                level: 'Warning',
                message: `Event '${event.eventName}' has no forms assigned in the visit schedule.`,
                location: `Events > ${event.eventName}`
            });
        }

        event.forms.forEach(fRef => {
            if (!study.forms[fRef.formOid]) {
                issues.push({
                    level: 'Error',
                    message: `Event '${event.eventName}' references non-existent Form ID: '${fRef.formOid}'`,
                    location: `Events > ${event.eventName}`
                });
            }
        });
    });

    // 2. Referential Integrity & Metadata Rules: Forms -> Groups -> Items
    const globalItemOids = new Set<string>();

    Object.values(study.forms).forEach(form => {
        form.itemGroups.forEach(group => {
            if (group.items.length === 0) {
                issues.push({
                    level: 'Warning',
                    message: `Group '${group.name}' is empty.`,
                    location: `Forms > ${form.formName}`
                });
            }

            group.items.forEach(item => {
                const row = (item as any).rowIndex;

                // Check for Duplicate OIDs (Within Form scope for CRF, Global for ODM)
                if (globalItemOids.has(item.itemOid)) {
                    issues.push({
                        level: 'Error',
                        message: `Duplicate Variable Name found: '${item.itemOid}'. Names must be unique across the study.`,
                        location: `${form.formName} > ${item.name}`,
                        rowIndex: row
                    });
                }
                globalItemOids.add(item.itemOid);

                // Check Codelist References
                if (item.dataType === 'Codelist' || item.codelistId) {
                    if (!item.codelistId) {
                        issues.push({
                            level: 'Error',
                            message: `Item is marked as 'Codelist' but the Catalog/Codelist ID is empty.`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: row
                        });
                    } else if (!study.codelists[item.codelistId]) {
                        issues.push({
                            level: 'Error',
                            message: `Missing Codelist definition: '${item.codelistId}' was not found in the Codelists sheet.`,
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: row
                        });
                    }
                }

                // Regulatory Checks: SAS Constraints
                if (item.sdtmMapping?.sasLabel) {
                    if (item.sdtmMapping.sasLabel.length > 40) {
                        issues.push({
                            level: 'Warning',
                            message: 'SAS Label exceeds 40 characters (Regulatory limit).',
                            location: `${form.formName} > ${item.name}`,
                            rowIndex: row
                        });
                    }
                } else {
                    issues.push({
                        level: 'Warning',
                        message: 'SAS Label is missing (Recommended for SDTM compliance).',
                        location: `${form.formName} > ${item.name}`,
                        rowIndex: row
                    });
                }

                // UI Checks: Labels
                if (!item.label["en-US"] || item.label["en-US"].trim() === "") {
                    issues.push({
                        level: 'Warning',
                        message: 'Question label is empty. This will appear as a blank line on the Paper CRF.',
                        location: `${form.formName} > ${item.name}`,
                        rowIndex: row
                    });
                }
            });
        });
    });

    return issues;
}
