/**
 * @issue #128
 */
import {
  CodelistDiffEntry,
  FormDiffEntry,
  ItemDiffEntry,
  RuleDiffEntry,
  StudyDiffReport,
  StudyDiffListEntry,
  StudyDiffFilters,
  DiffEntityGroup,
  DiffChangeClass,
  DiffSeverity,
} from "../../core/types";

import { inferSeverity, detectMovedOrRenamed } from "../../core/utils/clinical-utils";

const DEFAULT_FILTERS: StudyDiffFilters = {
  changeClass: "all",
  subsystem: "all",
  severity: "all",
  area: "all",
};

/**
 * Convert a form diff entry into a study diff list entry for display.
 *
 * Converts the provided `FormDiffEntry` into a `StudyDiffListEntry` describing the form-level change; returns `null` for entries with operation `"unchanged"`.
 *
 * @param entry - Diff entry describing changes for a form
 * @returns A `StudyDiffListEntry` representing the form change, or `null` if the entry is unchanged
 */
function toFormEntry(entry: FormDiffEntry): StudyDiffListEntry | null {
  if (entry.operation === "unchanged") return null;
  const snapshot = entry.current ?? entry.baseline;
  return {
    id: `forms:${entry.formOid}`,
    group: "forms",
    key: entry.formOid,
    title: entry.formOid,
    subtitle: snapshot?.formName || "Unnamed form",
    operation: entry.operation,
    changeClass: entry.operation,
    severity: inferSeverity(entry.operation),
    subsystem: "Structure",
    area: entry.formOid,
    changedFields: entry.changedFields ?? [],
    justification: entry.justification,
  };
}

function toItemEntry(entry: ItemDiffEntry): StudyDiffListEntry | null {
  if (entry.operation === "unchanged") return null;
  const snapshot = entry.current ?? entry.baseline;
  return {
    id: `items:${entry.formOid}:${entry.itemOid}`,
    group: "items",
    key: `${entry.formOid}.${entry.itemOid}`,
    title: `${entry.formOid}.${entry.itemOid}`,
    subtitle: snapshot?.label?.["en-US"] || snapshot?.name || "Unnamed item",
    operation: entry.operation,
    changeClass: entry.operation,
    severity: inferSeverity(entry.operation),
    subsystem: "Structure",
    area: entry.formOid,
    changedFields: entry.changedFields ?? [],
    justification: entry.justification,
  };
}

/**
 * Converts a codelist diff record into a list entry suitable for the study-diff view.
 *
 * @param entry - The codelist diff record containing `baseline` and/or `current` snapshots, the diff `operation`, and optional `changedFields`.
 * @returns The corresponding `StudyDiffListEntry` for display, or `null` if the entry's operation is `"unchanged"`.
 */
function toCodelistEntry(entry: CodelistDiffEntry): StudyDiffListEntry | null {
  if (entry.operation === "unchanged") return null;
  const snapshot = entry.current ?? entry.baseline;
  return {
    id: `codelists:${entry.codelistId}`,
    group: "codelists",
    key: entry.codelistId,
    title: entry.codelistId,
    subtitle: snapshot?.codelistName || "Unnamed codelist",
    operation: entry.operation,
    changeClass: entry.operation,
    severity: inferSeverity(entry.operation),
    subsystem: "Terminology",
    area: "Global",
    changedFields: entry.changedFields ?? [],
  };
}

/**
 * Convert a rule diff entry into a study diff list entry for display.
 *
 * @param entry - The rule diff entry to convert.
 * @returns The corresponding StudyDiffListEntry, or `null` if the entry's operation is `"unchanged"`.
 */
function toRuleEntry(entry: RuleDiffEntry): StudyDiffListEntry | null {
  if (entry.operation === "unchanged") return null;
  return {
    id: `rules:${entry.ruleId}`,
    group: "rules",
    key: entry.ruleId,
    title: entry.ruleId,
    subtitle: entry.current?.ruleType ?? entry.baseline?.ruleType ?? "Rule",
    operation: entry.operation,
    changeClass: entry.operation,
    severity: inferSeverity(entry.operation),
    subsystem: "Rules",
    area: "Global",
    changedFields: entry.changedFields ?? [],
  };
}

/**
 * Builds a flattened, post-processed list of study diff entries from a diff report.
 *
 * The result contains entries for forms, items, codelists, and rules (excluding unchanged entries),
 * adjusted for detected moves/renames and sorted by `entry.key`.
 *
 * @returns An array of `StudyDiffListEntry` representing changed entities from the report, with moved/renamed adjustments applied and sorted by `key`.
 */
export function buildStudyDiffList(report: StudyDiffReport): StudyDiffListEntry[] {
  const entries = [
    ...report.forms.map(toFormEntry),
    ...report.items.map(toItemEntry),
    ...report.codelists.map(toCodelistEntry),
    ...report.rules.map(toRuleEntry),
  ].filter((entry): entry is StudyDiffListEntry => entry !== null);

  return detectMovedOrRenamed(entries, report).sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

export function filterStudyDiffList(
  entries: StudyDiffListEntry[],
  group: DiffEntityGroup,
  filters: Partial<StudyDiffFilters> = {}
): StudyDiffListEntry[] {
  const applied = { ...DEFAULT_FILTERS, ...filters };
  return entries.filter((entry) => {
    if (entry.group !== group) return false;
    if (applied.changeClass !== "all" && entry.changeClass !== applied.changeClass) return false;
    if (applied.subsystem !== "all" && entry.subsystem !== applied.subsystem) return false;
    if (applied.severity !== "all" && entry.severity !== applied.severity) return false;
    if (applied.area !== "all" && entry.area !== applied.area) return false;
    return true;
  });
}

export function paginateStudyDiffList(
  entries: StudyDiffListEntry[],
  page: number,
  pageSize: number
) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(entries.length / safePageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * safePageSize;
  return {
    page: normalizedPage,
    totalPages,
    pageSize: safePageSize,
    entries: entries.slice(start, start + safePageSize),
  };
}
