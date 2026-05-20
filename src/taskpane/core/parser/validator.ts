import { StudyDesign } from "../types/index";
import { validateRules } from "./rules-validator";


export interface ValidationIssue {
  level: "Error" | "Warning";
  message: string;
  location?: string;
  rowIndex?: number;
  sheetName?: string; // Tracks which tab the error lives on
}

export function validateStudyDesign(
  study: StudyDesign,
  activeSheetFilter?: string
): ValidationIssue[] {
  let issues: ValidationIssue[] = [];

  // 1. Validate Schedule (_Schedule sheet)
  study.events.forEach((event) => {
    event.forms.forEach((fRef) => {
      if (!study.forms[fRef.formOid]) {
        issues.push({
          level: "Error",
          message: `Event '${event.eventName}' references non-existent Form ID '${fRef.formOid}'.`,
          location: `_Schedule > ${event.eventName}`,
          sheetName: "_Schedule",
        });
      }
    });
  });

  // 2. Validate CRF Forms (Individual tabs)
  const globalVariables = new Set<string>();

  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        const row = (item as any).rowIndex;
        const sheet = form.formOid;

        // Check Missing Variables
        if (!item.itemOid) {
          issues.push({
            level: "Error",
            message: "Missing Variable Name.",
            location: `${sheet} > Row ${row}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }

        // Check Codelist References
        if (item.dataType === "Codelist" || item.codelistId) {
          if (!item.codelistId) {
            issues.push({
              level: "Error",
              message: `Type is Codelist, but ID is blank.`,
              location: `${form.formName} > ${item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          } else if (!study.codelists[item.codelistId]) {
            issues.push({
              level: "Error",
              message: `Missing Codelist definition for '${item.codelistId}'.`,
              location: `${form.formName} > ${item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }
        }

        // Check Duplicates
        if (item.itemOid) {
          if (globalVariables.has(item.itemOid)) {
            issues.push({
              level: "Error",
              message: `Duplicate Variable Name: '${item.itemOid}'. Must be unique across study.`,
              location: `${sheet} > ${item.itemOid}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }
          globalVariables.add(item.itemOid);
        }

        const isNumericVariable = isNumericDataType(item.dataType);
        const hasLength = item.length !== undefined && item.length !== null;
        const hasSignificantDigits =
          item.significantDigits !== undefined && item.significantDigits !== null;
        const length = Number(item.length);
        const significantDigits = Number(item.significantDigits);

        if (hasLength && (!Number.isInteger(length) || length <= 0)) {
          issues.push({
            level: "Error",
            message: "Length must be a positive integer.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }

        if (
          hasSignificantDigits &&
          (!Number.isInteger(significantDigits) || significantDigits < 0)
        ) {
          issues.push({
            level: "Error",
            message: "Significant Digits must be a non-negative integer.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }

        if (isNumericVariable) {
          if (!hasLength) {
            issues.push({
              level: "Warning",
              message: "Numeric variables should define Length.",
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }

          if (!hasSignificantDigits) {
            issues.push({
              level: "Warning",
              message: "Numeric variables should define Significant Digits.",
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }

          if (hasSignificantDigits && significantDigits === 0) {
            issues.push({
              level: "Warning",
              message: "Significant Digits of 0 is likely too coarse for numeric variables.",
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }
        } else if (hasSignificantDigits) {
          issues.push({
            level: "Warning",
            message: "Significant Digits is typically only used for numeric variables.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }

        if (
          hasLength &&
          hasSignificantDigits &&
          Number.isInteger(length) &&
          length > 0 &&
          Number.isInteger(significantDigits) &&
          significantDigits >= 0 &&
          significantDigits > length
        ) {
          issues.push({
            level: "Error",
            message: "Significant Digits cannot exceed Length.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }
      });
    });
  });

  // 3. Validate Rules (_Rules sheet)
  if (study.rules && study.rules.length > 0) {
    const rulesResult = validateRules(study.rules, study);
    rulesResult.errors.forEach((err) => {
      issues.push({
        level: err.level,
        message: err.actionableExplanation || err.message,
        location: `Rule ${err.ruleId}`,
        rowIndex: err.rowIndex,
        sheetName: "_Rules",
      });
    });
  }


  // Contextual Filtering: If a filter is provided, only return issues for that sheet.
  // Allow system sheets to see everything, but CRF tabs only see their own errors.
  if (activeSheetFilter && !activeSheetFilter.startsWith("_")) {
    issues = issues.filter((i) => i.sheetName === activeSheetFilter);
  }

  return issues;
}

function isNumericDataType(dataType: unknown): boolean {
  const normalized = String(dataType ?? "").toLowerCase();
  return normalized === "integer" || normalized === "float";
}
