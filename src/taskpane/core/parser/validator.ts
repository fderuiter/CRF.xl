/**
 * @issue #53, #54, #55
 */
import { StudyDesign, RuleType, CrfItem, DataOrigin, isCrfItem } from "../types/index";
import { validateRules, collectIdentifiers } from "./dag-validator";
import { parseRuleExpression } from "./rules-parser";

export interface ValidationIssue {
  level: "Error" | "Warning";
  message: string;
  location?: string;
  rowIndex?: number;
  sheetName?: string; // Tracks which tab the error lives on
  oid?: string; // Clinical OID (Variable Name) for stable anchoring
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

/**
 * Validate a StudyDesign and produce a list of validation issues found across the schedule, CRF forms, rules, and cross-form dependencies.
 *
 * Performs structural checks (schedule and form references), per-item validations (variable names, codelists, numeric constraints, origins/methods, SDTM mapping), rule validation, and cross-form dependency analysis. If an active sheet filter is provided (and does not start with "_"), only issues for that sheet are returned.
 *
 * @param study - The study design to validate.
 * @param activeSheetFilter - Optional sheet OID to restrict returned issues to a single form tab; system sheets (names starting with "_") are not filtered by this parameter.
 * @param options - Optional execution controls:
 *   - isExport: when true, missing cross-form targets are treated as errors rather than warnings;
 *   - yieldControl: optional async callback that can be awaited to yield control during long-running validation;
 *   - cancellationToken: optional token with isCancelled() used to abort validation early and return collected issues.
 * @returns An array of ValidationIssue objects describing errors and warnings discovered in the provided study design.
 */
export async function validateStudyDesign(
  study: StudyDesign,
  activeSheetFilter?: string,
  options?: { isExport?: boolean, yieldControl?: () => Promise<void>, cancellationToken?: { isCancelled: () => boolean } }
): Promise<ValidationIssue[]> {
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
        if (!isCrfItem(item)) {
          return;
        }
        const row = (item as any).rowIndex;
        const sheet = form.formOid;

        // Check Missing Variables
        if (!item.itemOid) {
          issues.push({
            level: "Error",
            message: "Missing Variable Name.",
            location: `${sheet} > Row ${row}`,
            rowIndex: row,
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
              sheetName: sheet,
            });
          } else if (!study.codelists[item.codelistId]) {
            issues.push({
              level: "Error",
              message: `Missing Codelist definition for '${item.codelistId}'.`,
              location: `${form.formName} > ${item.name}`,
              rowIndex: row,
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
              sheetName: sheet,
            });
          }

          if (!hasSignificantDigits) {
            issues.push({
              level: "Warning",
              message: "Numeric variables should define Significant Digits.",
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
            oid: (item as any).itemOid || undefined,
              sheetName: sheet,
            });
          }

          if (hasSignificantDigits && significantDigits === 0) {
            issues.push({
              level: "Warning",
              message: "Significant Digits of 0 is likely too coarse for numeric variables.",
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
            oid: (item as any).itemOid || undefined,
              sheetName: sheet,
            });
          }
        } else if (hasSignificantDigits) {
          issues.push({
            level: "Warning",
            message: "Significant Digits is typically only used for numeric variables.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
            sheetName: sheet,
          });
        }

        if (item.methodOid && item.methodOid.trim()) {
          const cleanMethodOid = item.methodOid.trim().toLowerCase();
          const methodsKeys = study.methods
            ? Object.keys(study.methods).map((k) => k.toLowerCase())
            : [];
          if (!methodsKeys.includes(cleanMethodOid)) {
            issues.push({
              level: "Error",
              message: `Referenced Method OID '${item.methodOid}' does not exist in _Methods.`,
              location: `${sheet} > ${item.itemOid || item.name}`,
              rowIndex: row,
            oid: (item as any).itemOid || undefined,
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
            oid: (item as any).itemOid || undefined,
            sheetName: sheet,
          });
        } else if (hasVariable && !hasDomain) {
          issues.push({
            level: "Warning",
            message: "SDTM Variable is specified but companion SDTM Domain is missing.",
            location: `${sheet} > ${item.itemOid || item.name}`,
            rowIndex: row,
            oid: (item as any).itemOid || undefined,
            sheetName: sheet,
          });
        }
      });
    });
  });

  // 3. Validate Rules (_Rules sheet)
  if (study.rules && study.rules.length > 0) {
    if (options?.cancellationToken?.isCancelled?.()) return issues;
    const rulesResult = await validateRules(study.rules, study, options);
    if (options?.cancellationToken?.isCancelled?.()) return issues;
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
  const crossFormResult = validateCrossFormDependencies(study, options);
  issues.push(...crossFormResult.issues);
  study.crossFormDependencies = crossFormResult.dependencies;

  // Contextual Filtering: If a filter is provided, only return issues for that sheet.
  // Allow system sheets to see everything, but CRF tabs only see their own errors.
  if (activeSheetFilter && !activeSheetFilter.startsWith("_")) {
    issues = issues.filter((i) => i.sheetName === activeSheetFilter);
  }

  return issues;
}

/**
 * Analyze expressions across the study to identify cross-form dependencies and related validation issues.
 *
 * Scans all forms, groups, items, and rules to resolve identifiers referenced in ShowIf, rule, and derivation/validation expressions,
 * producing a list of `CrossFormDependency` records (with status/severity/message) and corresponding `ValidationIssue` entries
 * for parse errors, broken references, unreachable or ambiguous cross-form references, and unsupported target types.
 *
 * @param study - The study design to analyze
 * @param options.isExport - When true, unresolved identifiers are treated as `Error` instead of `Warning`
 * @returns An object containing:
 *  - `issues`: an array of `ValidationIssue` entries created during analysis (parse errors, broken references, unreachable/ambiguous dependencies, etc.)
 *  - `dependencies`: an array of `CrossFormDependency` records describing each discovered cross-form reference and its status
 */
export function validateCrossFormDependencies(study: StudyDesign, options?: { isExport?: boolean }): {
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
        if (!isCrfItem(item)) {
          return;
        }
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
            oid: typeof sourceOid !== "undefined" ? sourceOid : undefined,
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

        const isLocal = !ident.includes(".");
        const isExport = options?.isExport === true;
        const missingSeverity = (isExport || isLocal) ? "Error" : "Warning";

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
          severity: missingSeverity,
          message: `Broken reference: target '${ident}' does not exist.`,
        });

        issues.push({
          level: missingSeverity,
          message: `Broken reference: target '${ident}' does not exist.`,
          location: `${sourceFormOid} > Row ${sourceRowIndex ?? "unknown"}`,
          rowIndex: sourceRowIndex,
            oid: typeof sourceOid !== "undefined" ? sourceOid : undefined,
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
            oid: typeof sourceOid !== "undefined" ? sourceOid : undefined,
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
        if (!isCrfItem(item)) {
          return;
        }
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

/**
 * Validates submission metadata and item mappings to determine release readiness.
 *
 * Checks central SDTM/ADaM dataset and derivation definitions for required fields, verifies per-item SDTM/ADaM mappings reference defined datasets and include required mapping fields, and confirms derived variables reference defined methods or derivations.
 *
 * @param study - The study design containing submission metadata, forms, and methods to validate
 * @returns A list of validation issues found in submission metadata and item mappings
 */
export function validateSubmissionMetadataForRelease(study: StudyDesign): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const sdtmDatasetDomains = new Set<string>();
  const adamDatasetNames = new Set<string>();
  const sdtmDerivationIds = new Set<string>();
  const adamDerivationIds = new Set<string>();

  // Collect defined datasets and derivations
  if (study.submissionMetadata) {
    if (study.submissionMetadata.sdtmDatasets) {
      study.submissionMetadata.sdtmDatasets.forEach((ds) => {
        if (ds.domain) {
          sdtmDatasetDomains.add(ds.domain.toUpperCase());
          // Validate dataset metadata required fields
          if (!ds.label) {
            issues.push({
              level: "Error",
              message: `SDTM Dataset Metadata '${ds.domain}' is missing a label.`,
              sheetName: "_Study",
            });
          }
          if (!ds.structure) {
            issues.push({
              level: "Error",
              message: `SDTM Dataset Metadata '${ds.domain}' is missing structure details.`,
              sheetName: "_Study",
            });
          }
          if (!ds.class) {
            issues.push({
              level: "Error",
              message: `SDTM Dataset Metadata '${ds.domain}' is missing class designation.`,
              sheetName: "_Study",
            });
          }
        }
      });
    }

    if (study.submissionMetadata.adamDatasets) {
      study.submissionMetadata.adamDatasets.forEach((ds) => {
        if (ds.dataset) {
          adamDatasetNames.add(ds.dataset.toUpperCase());
          // Validate dataset metadata required fields
          if (!ds.label) {
            issues.push({
              level: "Error",
              message: `ADaM Dataset Metadata '${ds.dataset}' is missing a label.`,
              sheetName: "_Study",
            });
          }
          if (!ds.structure) {
            issues.push({
              level: "Error",
              message: `ADaM Dataset Metadata '${ds.dataset}' is missing structure details.`,
              sheetName: "_Study",
            });
          }
          if (!ds.class) {
            issues.push({
              level: "Error",
              message: `ADaM Dataset Metadata '${ds.dataset}' is missing class designation.`,
              sheetName: "_Study",
            });
          }
        }
      });
    }

    if (study.submissionMetadata.sdtmDerivations) {
      study.submissionMetadata.sdtmDerivations.forEach((der) => {
        if (der.derivationId) {
          sdtmDerivationIds.add(der.derivationId.toUpperCase());
          if (!der.description) {
            issues.push({
              level: "Error",
              message: `SDTM Derivation '${der.derivationId}' is missing a description.`,
              sheetName: "_Study",
            });
          }
        }
      });
    }

    if (study.submissionMetadata.adamDerivations) {
      study.submissionMetadata.adamDerivations.forEach((der) => {
        if (der.derivationId) {
          adamDerivationIds.add(der.derivationId.toUpperCase());
          if (!der.description) {
            issues.push({
              level: "Error",
              message: `ADaM Derivation '${der.derivationId}' is missing a description.`,
              sheetName: "_Study",
            });
          }
        }
      });
    }
  }

  // Validate items
  if (study.forms) {
    Object.values(study.forms).forEach((form) => {
      form.itemGroups.forEach((group) => {
        group.items.forEach((item) => {
          if (!isCrfItem(item)) {
            return;
          }
          const row = (item as any).rowIndex;
          const sheet = form.formOid;

          // 1. Validate SDTM Variable Mapping
          if (item.sdtmMapping) {
            const hasDomain = !!item.sdtmMapping.domain && !!item.sdtmMapping.domain.trim();
            const hasVar = !!item.sdtmMapping.variable && !!item.sdtmMapping.variable.trim();

            if (hasDomain || hasVar) {
              if (!hasDomain) {
                issues.push({
                  level: "Error",
                  message: `SDTM variable '${item.sdtmMapping.variable}' is mapped but SDTM domain is missing.`,
                  location: `${sheet} > Row ${row}`,
                  rowIndex: row,
            oid: (item as any).itemOid || undefined,
                  sheetName: sheet,
                });
              } else if (!hasVar) {
                issues.push({
                  level: "Error",
                  message: `SDTM domain '${item.sdtmMapping.domain}' is mapped but SDTM variable name is missing.`,
                  location: `${sheet} > Row ${row}`,
                  rowIndex: row,
            oid: (item as any).itemOid || undefined,
                  sheetName: sheet,
                });
              } else {
                // Both domain and variable are present
                const domainUpper = item.sdtmMapping.domain.toUpperCase();
                // Check if references a valid defined dataset
                if (sdtmDatasetDomains.size > 0 && !sdtmDatasetDomains.has(domainUpper)) {
                  issues.push({
                    level: "Error",
                    message: `SDTM variable '${item.sdtmMapping.domain}.${item.sdtmMapping.variable}' references undefined domain '${item.sdtmMapping.domain}' in central dataset metadata.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }

                // Check other required variable fields for release
                if (!item.sdtmMapping.core) {
                  issues.push({
                    level: "Error",
                    message: `SDTM variable '${item.sdtmMapping.domain}.${item.sdtmMapping.variable}' is missing Core requiredness designation.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.sdtmMapping.role) {
                  issues.push({
                    level: "Error",
                    message: `SDTM variable '${item.sdtmMapping.domain}.${item.sdtmMapping.variable}' is missing Role designation.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.sdtmMapping.sasFieldName) {
                  issues.push({
                    level: "Error",
                    message: `SDTM variable '${item.sdtmMapping.domain}.${item.sdtmMapping.variable}' is missing SAS Field Name.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.sdtmMapping.sasLabel) {
                  issues.push({
                    level: "Error",
                    message: `SDTM variable '${item.sdtmMapping.domain}.${item.sdtmMapping.variable}' is missing SAS Label.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
              }
            }
          }

          // 2. Validate ADaM Variable Mapping
          if (item.adamMapping) {
            const hasDs = !!item.adamMapping.dataset && !!item.adamMapping.dataset.trim();
            const hasVar = !!item.adamMapping.variable && !!item.adamMapping.variable.trim();

            if (hasDs || hasVar) {
              if (!hasDs) {
                issues.push({
                  level: "Error",
                  message: `ADaM variable '${item.adamMapping.variable}' is mapped but ADaM dataset is missing.`,
                  location: `${sheet} > Row ${row}`,
                  rowIndex: row,
            oid: (item as any).itemOid || undefined,
                  sheetName: sheet,
                });
              } else if (!hasVar) {
                issues.push({
                  level: "Error",
                  message: `ADaM dataset '${item.adamMapping.dataset}' is mapped but ADaM variable name is missing.`,
                  location: `${sheet} > Row ${row}`,
                  rowIndex: row,
            oid: (item as any).itemOid || undefined,
                  sheetName: sheet,
                });
              } else {
                // Both dataset and variable are present
                const dsUpper = item.adamMapping.dataset.toUpperCase();
                // Check if references a valid defined dataset
                if (adamDatasetNames.size > 0 && !adamDatasetNames.has(dsUpper)) {
                  issues.push({
                    level: "Error",
                    message: `ADaM variable '${item.adamMapping.dataset}.${item.adamMapping.variable}' references undefined dataset '${item.adamMapping.dataset}' in central dataset metadata.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }

                // Check other required variable fields for release
                if (!item.adamMapping.core) {
                  issues.push({
                    level: "Error",
                    message: `ADaM variable '${item.adamMapping.dataset}.${item.adamMapping.variable}' is missing Core requiredness designation.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.adamMapping.role) {
                  issues.push({
                    level: "Error",
                    message: `ADaM variable '${item.adamMapping.dataset}.${item.adamMapping.variable}' is missing Role designation.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.adamMapping.sasFieldName) {
                  issues.push({
                    level: "Error",
                    message: `ADaM variable '${item.adamMapping.dataset}.${item.adamMapping.variable}' is missing SAS Field Name.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
                if (!item.adamMapping.sasLabel) {
                  issues.push({
                    level: "Error",
                    message: `ADaM variable '${item.adamMapping.dataset}.${item.adamMapping.variable}' is missing SAS Label.`,
                    location: `${sheet} > Row ${row}`,
                    rowIndex: row,
            oid: (item as any).itemOid || undefined,
                    sheetName: sheet,
                  });
                }
              }
            }
          }

          // 3. Validate derivation reference consistency for Derived origin variables
          if (item.origin === DataOrigin.DERIVED) {
            // If item has a methodOid, it must be defined in central derivations/methods
            if (item.methodOid) {
              const hasCoreMethod = study.methods && study.methods[item.methodOid];
              const hasSdtmDer = sdtmDerivationIds.has(item.methodOid.toUpperCase());
              const hasAdamDer = adamDerivationIds.has(item.methodOid.toUpperCase());

              if (!hasCoreMethod && !hasSdtmDer && !hasAdamDer) {
                issues.push({
                  level: "Error",
                  message: `Derived variable '${item.itemOid}' references undefined Method/Derivation OID '${item.methodOid}'.`,
                  location: `${sheet} > Row ${row}`,
                  rowIndex: row,
            oid: (item as any).itemOid || undefined,
                  sheetName: sheet,
                });
              }
            }
          }
        });
      });
    });
  }

  return issues;
}
