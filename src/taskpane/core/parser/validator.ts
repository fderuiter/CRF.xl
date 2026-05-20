import { StudyDesign, RuleType, CrfItem, DataOrigin } from "../types/index";
import { validateRules, collectIdentifiers } from "./rules-validator";
import { parseRuleExpression } from "./rules-parser";

export interface ValidationIssue {
  level: "Error" | "Warning";
  message: string;
  location?: string;
  rowIndex?: number;
  sheetName?: string; // Tracks which tab the error lives on
}

export interface CrossFormDependency {
  id: string;
  sourceFormOid: string;
  sourceOid: string; // itemOid, groupOid, or ruleId
  sourceType: "Item" | "Group" | "Rule";
  sourceRowIndex?: number;
  targetFormOid: string;
  targetOid: string; // itemOid or ruleId
  targetType: "Item" | "Rule" | "Unknown";
  targetRowIndex?: number;
  expression: string;
  dependencyType: "ShowIf" | "Derivation" | "Validation";
  status: "Valid" | "Broken" | "Unreachable" | "Unsupported" | "Ambiguous";
  severity: "Error" | "Warning" | "OK";
  message: string;
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

        // VLM & Methods Validation
        const validOrigins = Object.values(DataOrigin) as string[];
        if (item.origin) {
          if (!validOrigins.includes(item.origin)) {
            issues.push({
              level: "Error",
              message: `Invalid Origin value: '${item.origin}'. Must be one of: ${validOrigins.join(", ")}.`,
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }
        }

        if (
          (item.origin === DataOrigin.DERIVED || item.origin === DataOrigin.ASSIGNED) &&
          (!item.methodOid || !item.methodOid.trim())
        ) {
          issues.push({
            level: "Error",
            message: `Method OID is required when Origin is '${item.origin}'.`,
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        }

        if (item.methodOid && item.methodOid.trim()) {
          const cleanMethodOid = item.methodOid.trim().toLowerCase();
          const methodsKeys = study.methods ? Object.keys(study.methods).map(k => k.toLowerCase()) : [];
          if (!methodsKeys.includes(cleanMethodOid)) {
            issues.push({
              level: "Error",
              message: `Referenced Method OID '${item.methodOid}' does not exist in _Methods.`,
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
              sheetName: sheet,
            });
          }
        }

        const hasDomain = !!item.sdtmMapping?.domain && !!item.sdtmMapping.domain.trim();
        const hasVariable = !!item.sdtmMapping?.variable && !!item.sdtmMapping.variable.trim();
        if (hasDomain && !hasVariable) {
          issues.push({
            level: "Warning",
            message: "SDTM Domain is specified but companion SDTM Variable is missing.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            sheetName: sheet,
          });
        } else if (hasVariable && !hasDomain) {
          issues.push({
            level: "Warning",
            message: "SDTM Variable is specified but companion SDTM Domain is missing.",
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

  // 4. Validate Cross-Form Dependencies
  const crossFormResult = validateCrossFormDependencies(study);
  issues.push(...crossFormResult.issues);
  study.crossFormDependencies = crossFormResult.dependencies;

  // Contextual Filtering: If a filter is provided, only return issues for that sheet.
  // Allow system sheets to see everything, but CRF tabs only see their own errors.
  if (activeSheetFilter && !activeSheetFilter.startsWith("_")) {
    issues = issues.filter((i) => i.sheetName === activeSheetFilter);
  }

  return issues;
}

export function validateCrossFormDependencies(study: StudyDesign): {
  issues: ValidationIssue[];
  dependencies: CrossFormDependency[];
} {
  const issues: ValidationIssue[] = [];
  const dependencies: CrossFormDependency[] = [];

  // Gather all variables and their locations for quick lookup
  const variableMap = new Map<
    string,
    { item: CrfItem; formOid: string; groupOid: string; rowIndex?: number }
  >();

  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.itemOid) {
          variableMap.set(item.itemOid.toLowerCase(), {
            item,
            formOid: form.formOid,
            groupOid: group.groupOid,
            rowIndex: (item as any).rowIndex,
          });
        }
      });
    });
  });

  // Helper to resolve an identifier to its target
  function resolveIdent(ident: string) {
    const isRuleLike = /^R(?:ule)?_?\d+$/i.test(ident);
    const lowercaseIdent = ident.toLowerCase();

    // 1. Try rule ID match
    if (study.rules) {
      const matchedRule = study.rules.find((r) => r.ruleId.toLowerCase() === lowercaseIdent);
      if (matchedRule) {
        if (matchedRule.target) {
          const varRes = variableMap.get(matchedRule.target.toLowerCase());
          return {
            targetRule: matchedRule,
            targetItem: varRes?.item,
            targetFormOid: varRes?.formOid,
            targetRowIndex: varRes?.rowIndex,
            isRuleLike: true,
            type: "Rule" as const,
          };
        }
        return { targetRule: matchedRule, isRuleLike: true, type: "Rule" as const };
      }
    }

    // 2. Try exact variable match
    const varRes = variableMap.get(lowercaseIdent);
    if (varRes) {
      return {
        targetItem: varRes.item,
        targetFormOid: varRes.formOid,
        targetRowIndex: varRes.rowIndex,
        isRuleLike,
        type: "Item" as const,
      };
    }

    // 3. Try dot-separated qualified variable match (e.g. FormOid.VariableOid)
    const segments = ident.split(".");
    if (segments.length > 1) {
      const varName = segments[segments.length - 1].toLowerCase();
      const possibleFormOid = segments[0].toUpperCase();
      const form = study.forms[possibleFormOid];
      if (form) {
        const itemRes = variableMap.get(varName);
        if (itemRes && itemRes.formOid === possibleFormOid) {
          return {
            targetItem: itemRes.item,
            targetFormOid: itemRes.formOid,
            targetRowIndex: itemRes.rowIndex,
            isRuleLike,
            type: "Item" as const,
          };
        }
      }
    }

    return null;
  }

  // Helper to check if target form is scheduled before or with source form
  function isScheduledBeforeOrWith(sourceFormOid: string, targetFormOid: string): boolean {
    if (sourceFormOid === targetFormOid) return true;

    const sourceSched: { eventOrder: number; formOrder: number }[] = [];
    const targetSched: { eventOrder: number; formOrder: number }[] = [];

    study.events.forEach((evt) => {
      evt.forms.forEach((fRef) => {
        if (fRef.formOid === sourceFormOid) {
          sourceSched.push({ eventOrder: evt.orderNumber, formOrder: fRef.orderNumber });
        }
        if (fRef.formOid === targetFormOid) {
          targetSched.push({ eventOrder: evt.orderNumber, formOrder: fRef.orderNumber });
        }
      });
    });

    if (targetSched.length === 0) return false; // Target not scheduled at all
    if (sourceSched.length === 0) return true; // Source not scheduled, so we don't block

    for (const s of sourceSched) {
      for (const t of targetSched) {
        if (t.eventOrder < s.eventOrder) return true;
        if (t.eventOrder === s.eventOrder && t.formOrder <= s.formOrder) return true;
      }
    }
    return false;
  }

  // Helper to analyze a list of identifiers in an expression
  function analyzeExpression(
    sourceFormOid: string,
    sourceOid: string,
    sourceType: "Item" | "Group" | "Rule",
    sourceRowIndex: number | undefined,
    expression: string,
    dependencyType: "ShowIf" | "Derivation" | "Validation"
  ) {
    if (!expression || !expression.trim()) return;

    let ast;
    try {
      ast = parseRuleExpression(expression);
    } catch (err: any) {
      issues.push({
        level: "Error",
        message: `Parse Error in ${dependencyType} expression: ${err.message}`,
        location: `${sourceFormOid} > Row ${sourceRowIndex ?? "unknown"}`,
        rowIndex: sourceRowIndex,
        sheetName: sourceFormOid,
      });
      return;
    }

    const identifiers = collectIdentifiers(ast);

    identifiers.forEach((ident) => {
      const resolved = resolveIdent(ident);
      const isUnqualified = !ident.includes(".");

      if (!resolved) {
        const segments = ident.split(".");
        const isCrossFormSuspect =
          segments.length > 1 && study.forms[segments[0].toUpperCase()] !== undefined;

        dependencies.push({
          id: `${sourceFormOid}_${sourceOid}_to_${ident}_${dependencyType}`.replace(/\s+/g, "_"),
          sourceFormOid,
          sourceOid,
          sourceType,
          sourceRowIndex,
          targetFormOid: isCrossFormSuspect ? segments[0].toUpperCase() : "Unknown",
          targetOid: isCrossFormSuspect ? segments[segments.length - 1] : ident,
          targetType: "Unknown",
          expression,
          dependencyType,
          status: "Broken",
          severity: "Error",
          message: `Broken reference: target '${ident}' does not exist.`,
        });

        issues.push({
          level: "Error",
          message: `Broken reference: target '${ident}' does not exist.`,
          location: `${sourceFormOid} > Row ${sourceRowIndex ?? "unknown"}`,
          rowIndex: sourceRowIndex,
          sheetName: sourceFormOid,
        });
        return;
      }

      // Check if it is a cross-form dependency
      const targetFormOid = resolved.targetFormOid || "Unknown";
      const targetOid = resolved.targetItem?.itemOid || resolved.targetRule?.ruleId || ident;

      const isCrossForm = targetFormOid !== sourceFormOid && targetFormOid !== "Unknown";

      if (isCrossForm) {
        let status: "Valid" | "Broken" | "Unreachable" | "Unsupported" | "Ambiguous" = "Valid";
        let severity: "Error" | "Warning" | "OK" = "OK";
        let message = `Cross-form dependency is valid.`;

        // Check 1: Unsupported target type
        const targetItem = resolved.targetItem;
        if (targetItem) {
          const dt = String(targetItem.dataType).toLowerCase();
          if (
            dt === "file" ||
            dt === "annotation" ||
            dt === "displayonly" ||
            dt === "display only"
          ) {
            status = "Unsupported";
            severity = "Error";
            message = `Cross-form reference to unsupported target type '${targetItem.dataType}' for variable '${targetOid}'.`;
          }
        }

        // Check 2: Unreachable target due to invalid dependency chain
        if (severity !== "Error") {
          const scheduled = isScheduledBeforeOrWith(sourceFormOid, targetFormOid);
          if (!scheduled) {
            status = "Unreachable";
            severity = "Error";
            const targetFormScheduled = study.events.some((e) =>
              e.forms.some((fr) => fr.formOid === targetFormOid)
            );
            if (!targetFormScheduled) {
              message = `Unreachable target: Form '${targetFormOid}' containing '${targetOid}' is not scheduled in any event.`;
            } else {
              message = `Unreachable target: Form '${targetFormOid}' is scheduled after Form '${sourceFormOid}'.`;
            }
          }
        }

        // Check 3: Technically valid but high-risk/ambiguous reference
        if (severity === "OK") {
          if (isUnqualified) {
            status = "Ambiguous";
            severity = "Warning";
            message = `Technically valid but high-risk unqualified reference: '${targetOid}' should be qualified as '${targetFormOid}.${targetOid}'.`;
          } else {
            // Check repeating context mismatch
            const sourceForm = study.forms[sourceFormOid];
            const targetForm = study.forms[targetFormOid];
            const isSourceRepeating = sourceForm?.repeating === true;
            const isTargetRepeating = targetForm?.repeating === true;

            if (isTargetRepeating && !isSourceRepeating) {
              status = "Ambiguous";
              severity = "Warning";
              message = `High-risk reference: Non-repeating form/group references repeating variable '${targetOid}' in repeating form '${targetFormOid}'.`;
            }
          }
        }

        dependencies.push({
          id: `${sourceFormOid}_${sourceOid}_to_${targetFormOid}_${targetOid}_${dependencyType}`.replace(
            /\s+/g,
            "_"
          ),
          sourceFormOid,
          sourceOid,
          sourceType,
          sourceRowIndex,
          targetFormOid,
          targetOid,
          targetType: resolved.type,
          targetRowIndex: resolved.targetRowIndex,
          expression,
          dependencyType,
          status,
          severity,
          message,
        });

        if (severity === "Error" || severity === "Warning") {
          issues.push({
            level: severity,
            message,
            location: `${sourceFormOid} > Row ${sourceRowIndex ?? "unknown"}`,
            rowIndex: sourceRowIndex,
            sheetName: sourceFormOid,
          });
        }
      }
    });
  }

  // 2. Parse and analyze showIf expressions in all Forms
  Object.values(study.forms).forEach((form) => {
    form.itemGroups.forEach((group) => {
      // Analyze Group-level showIf
      if (group.showIf) {
        analyzeExpression(form.formOid, group.groupOid, "Group", undefined, group.showIf, "ShowIf");
      }

      // Analyze Item-level showIf
      group.items.forEach((item) => {
        if (item.showIf) {
          analyzeExpression(
            form.formOid,
            item.itemOid,
            "Item",
            (item as any).rowIndex,
            item.showIf,
            "ShowIf"
          );
        }
      });
    });
  });

  // 3. Parse and analyze rules from _Rules sheet
  if (study.rules) {
    study.rules.forEach((rule) => {
      if (rule.expression && !rule.parseError) {
        let sourceFormOid = "_Rules";
        let sourceOid = rule.ruleId;
        const targetRes = rule.target ? resolveIdent(rule.target) : null;
        if (targetRes && targetRes.targetFormOid) {
          sourceFormOid = targetRes.targetFormOid;
          sourceOid = rule.target || rule.ruleId;
        }

        analyzeExpression(
          sourceFormOid,
          sourceOid,
          "Rule",
          rule._sourceRowIndex,
          rule.expression,
          rule.ruleType === RuleType.DERIVATION ? "Derivation" : "Validation"
        );
      }
    });
  }

  return { issues, dependencies };
}

function isNumericDataType(dataType: unknown): boolean {
  const normalized = String(dataType ?? "").toLowerCase();
  return normalized === "integer" || normalized === "float";
}
