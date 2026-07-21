/**
 * @issue #129, #85
 */
/**
 * ============================================================================
 * diff-engine.ts
 * ============================================================================
 * Pure, side-effect-free engine that semantically compares two `StudyDesign`
 * objects and produces a deterministic `StudyDiffReport`.
 *
 * Usage:
 *   const report = diffStudyDesigns(baselineStudy, currentStudy);
 */

import { StudyDesign, CrfForm, CrfItem, isCrfItem } from "../types/hierarchy";
import { Codelist } from "../types/clinical";
import { RuleDefinition } from "../types/rules-ast";
import {
  StudyDiffReport,
  FormDiffEntry,
  ItemDiffEntry,
  CodelistDiffEntry,
  RuleDiffEntry,
  StudyMetadataDiff,
  DiffOperation,
} from "../types/diff";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when two values are deeply equal (JSON-serializable content).
 * Using JSON round-trip keeps the comparison deterministic and avoids
 * prototype-chain surprises from complex objects.
 * @param a
 * @param b
 * @returns
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Returns the list of top-level scalar keys whose values differ between
 * `baseline` and `current`. Comparison is deep.
 * @param baseline
 * @param current
 * @returns
 */
function changedKeys<T extends object>(baseline: T, current: T): string[] {
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  const changed: string[] = [];
  for (const key of Array.from(allKeys).sort()) {
    const bVal = (baseline as Record<string, unknown>)[key];
    const cVal = (current as Record<string, unknown>)[key];
    if (!deepEqual(bVal, cVal)) {
      changed.push(key);
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Form diffing
// ---------------------------------------------------------------------------

function diffForms(
  baseline: Record<string, CrfForm>,
  current: Record<string, CrfForm>
): FormDiffEntry[] {
  const allOids = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  const entries: FormDiffEntry[] = [];

  for (const formOid of Array.from(allOids).sort()) {
    const b = baseline[formOid];
    const c = current[formOid];

    let operation: DiffOperation;
    let changedFields: string[] | undefined;

    if (!b) {
      operation = "added";
    } else if (!c) {
      operation = "removed";
    } else {
      changedFields = changedKeys(b, c);
      operation = changedFields.length > 0 ? "modified" : "unchanged";
    }

    entries.push({
      operation,
      formOid,
      ...(b !== undefined ? { baseline: b } : {}),
      ...(c !== undefined ? { current: c } : {}),
      ...(changedFields !== undefined && changedFields.length > 0 ? { changedFields } : {}),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Item diffing
// ---------------------------------------------------------------------------

/**
 * Extracts all CrfItem nodes from a study, keyed by `formOid::itemOid`.
 * @param study
 * @returns
 */
function collectItems(study: StudyDesign): Map<string, CrfItem> {
  const map = new Map<string, CrfItem>();
  for (const form of Object.values(study.forms)) {
    for (const group of form.itemGroups) {
      for (const element of group.items) {
        if (isCrfItem(element)) {
          map.set(`${element.formOid}::${element.itemOid}`, element);
        }
      }
    }
  }
  return map;
}

function diffItems(baseline: StudyDesign, current: StudyDesign): ItemDiffEntry[] {
  const bItems = collectItems(baseline);
  const cItems = collectItems(current);

  const allKeys = new Set([...Array.from(bItems.keys()), ...Array.from(cItems.keys())]);
  const entries: ItemDiffEntry[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const b = bItems.get(key);
    const c = cItems.get(key);

    let operation: DiffOperation;
    let changedFields: string[] | undefined;

    if (!b) {
      operation = "added";
    } else if (!c) {
      operation = "removed";
    } else {
      changedFields = changedKeys(b, c);
      operation = changedFields.length > 0 ? "modified" : "unchanged";
    }

    const formOid = (b ?? c)!.formOid;
    const itemOid = (b ?? c)!.itemOid;

    entries.push({
      operation,
      formOid,
      itemOid,
      ...(b !== undefined ? { baseline: b } : {}),
      ...(c !== undefined ? { current: c } : {}),
      ...(changedFields !== undefined && changedFields.length > 0 ? { changedFields } : {}),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Codelist diffing
// ---------------------------------------------------------------------------

function diffCodelists(
  baseline: Record<string, Codelist>,
  current: Record<string, Codelist>
): CodelistDiffEntry[] {
  const allIds = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  const entries: CodelistDiffEntry[] = [];

  for (const codelistId of Array.from(allIds).sort()) {
    const b = baseline[codelistId];
    const c = current[codelistId];

    let operation: DiffOperation;
    let changedFields: string[] | undefined;

    if (!b) {
      operation = "added";
    } else if (!c) {
      operation = "removed";
    } else {
      changedFields = changedKeys(b, c);
      operation = changedFields.length > 0 ? "modified" : "unchanged";
    }

    entries.push({
      operation,
      codelistId,
      ...(b !== undefined ? { baseline: b } : {}),
      ...(c !== undefined ? { current: c } : {}),
      ...(changedFields !== undefined && changedFields.length > 0 ? { changedFields } : {}),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Rule diffing
// ---------------------------------------------------------------------------

function diffRules(
  baseline: RuleDefinition[] | undefined,
  current: RuleDefinition[] | undefined
): RuleDiffEntry[] {
  const bRules = new Map<string, RuleDefinition>((baseline ?? []).map((r) => [r.ruleId, r]));
  const cRules = new Map<string, RuleDefinition>((current ?? []).map((r) => [r.ruleId, r]));

  const allIds = new Set([...Array.from(bRules.keys()), ...Array.from(cRules.keys())]);
  const entries: RuleDiffEntry[] = [];

  for (const ruleId of Array.from(allIds).sort()) {
    const b = bRules.get(ruleId);
    const c = cRules.get(ruleId);

    let operation: DiffOperation;
    let changedFields: string[] | undefined;

    if (!b) {
      operation = "added";
    } else if (!c) {
      operation = "removed";
    } else {
      changedFields = changedKeys(b, c);
      operation = changedFields.length > 0 ? "modified" : "unchanged";
    }

    entries.push({
      operation,
      ruleId,
      ...(b !== undefined ? { baseline: b } : {}),
      ...(c !== undefined ? { current: c } : {}),
      ...(changedFields !== undefined && changedFields.length > 0 ? { changedFields } : {}),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Metadata diffing
// ---------------------------------------------------------------------------

function diffMetadata(
  baseline: StudyDesign["metadata"],
  current: StudyDesign["metadata"]
): StudyMetadataDiff {
  const changed = changedKeys(baseline, current);
  if (changed.length === 0) {
    return { operation: "unchanged" };
  }
  return { operation: "modified", changedFields: changed };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compares two `StudyDesign` objects and returns a deterministic
 * `StudyDiffReport`. The function is pure: it does not read from or write to
 * any workbook or session state.
 *
 * @param baseline - The reference (older) study design.
 * @param current  - The study design to compare against the baseline.
 * @returns A `StudyDiffReport` describing all differences.
 */
export function diffStudyDesigns(baseline: StudyDesign, current: StudyDesign): StudyDiffReport {
  return {
    baselineProtocolId: baseline.metadata.protocolId,
    currentProtocolId: current.metadata.protocolId,
    generatedAt: new Date().toISOString(),
    forms: diffForms(baseline.forms, current.forms),
    items: diffItems(baseline, current),
    codelists: diffCodelists(baseline.codelists, current.codelists),
    rules: diffRules(baseline.rules, current.rules),
    metadataDiff: diffMetadata(baseline.metadata, current.metadata),
  };
}
