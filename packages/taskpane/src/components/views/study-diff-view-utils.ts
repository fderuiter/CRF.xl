/**
 * @issue #128
 */
import { CodelistDiffEntry, FormDiffEntry, ItemDiffEntry, RuleDiffEntry, StudyDiffReport } from "@crf-xl/core/types/diff";


export type DiffEntityGroup = "forms" | "items" | "codelists" | "rules";
export type DiffChangeClass = "added" | "removed" | "modified" | "moved_or_renamed";
export type DiffSeverity = "low" | "medium" | "high";

export interface StudyDiffListEntry {
  id: string;
  group: DiffEntityGroup;
  key: string;
  title: string;
  subtitle: string;
  operation: "added" | "removed" | "modified";
  changeClass: DiffChangeClass;
  severity: DiffSeverity;
  subsystem: string;
  area: string;
  changedFields: string[];
  justification?: { reason: string; userId: string; timestamp: string };
}

export interface StudyDiffFilters {
  changeClass: DiffChangeClass | "all";
  subsystem: string | "all";
  severity: DiffSeverity | "all";
  area: string | "all";
}

const DEFAULT_FILTERS: StudyDiffFilters = {
  changeClass: "all",
  subsystem: "all",
  severity: "all",
  area: "all",
};

function inferSeverity(operation: "added" | "removed" | "modified"): DiffSeverity {
  if (operation === "removed") return "high";
  if (operation === "modified") return "medium";
  return "low";
}

function stableStringifyWithoutKeys(value: unknown, omittedKeys: string[]): string {
  if (!value || typeof value !== "object") return "";
  const omit = new Set(omittedKeys);
  const normalized = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !omit.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
  );
  return JSON.stringify(normalized);
}

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

function detectMovedOrRenamed(
  entries: StudyDiffListEntry[],
  report: StudyDiffReport
): StudyDiffListEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const signaturesByGroup = {
    forms: new Map<string, string[]>(),
    items: new Map<string, string[]>(),
    codelists: new Map<string, string[]>(),
    rules: new Map<string, string[]>(),
  };

  const register = (group: DiffEntityGroup, signature: string, id: string) => {
    if (!signature) return;
    const existing = signaturesByGroup[group].get(signature) ?? [];
    existing.push(id);
    signaturesByGroup[group].set(signature, existing);
  };

  report.forms.forEach((entry) => {
    if (entry.operation === "added") {
      register(
        "forms",
        stableStringifyWithoutKeys(entry.current, ["formOid"]),
        `forms:${entry.formOid}`
      );
    }
    if (entry.operation === "removed") {
      register(
        "forms",
        stableStringifyWithoutKeys(entry.baseline, ["formOid"]),
        `forms:${entry.formOid}`
      );
    }
  });
  report.items.forEach((entry) => {
    if (entry.operation === "added") {
      register(
        "items",
        stableStringifyWithoutKeys(entry.current, [
          "formOid",
          "groupOid",
          "itemOid",
          "orderNumber",
        ]),
        `items:${entry.formOid}:${entry.itemOid}`
      );
    }
    if (entry.operation === "removed") {
      register(
        "items",
        stableStringifyWithoutKeys(entry.baseline, [
          "formOid",
          "groupOid",
          "itemOid",
          "orderNumber",
        ]),
        `items:${entry.formOid}:${entry.itemOid}`
      );
    }
  });
  report.codelists.forEach((entry) => {
    if (entry.operation === "added") {
      register(
        "codelists",
        stableStringifyWithoutKeys(entry.current, ["codelistId"]),
        `codelists:${entry.codelistId}`
      );
    }
    if (entry.operation === "removed") {
      register(
        "codelists",
        stableStringifyWithoutKeys(entry.baseline, ["codelistId"]),
        `codelists:${entry.codelistId}`
      );
    }
  });
  report.rules.forEach((entry) => {
    if (entry.operation === "added") {
      register(
        "rules",
        stableStringifyWithoutKeys(entry.current, ["ruleId"]),
        `rules:${entry.ruleId}`
      );
    }
    if (entry.operation === "removed") {
      register(
        "rules",
        stableStringifyWithoutKeys(entry.baseline, ["ruleId"]),
        `rules:${entry.ruleId}`
      );
    }
  });

  Object.values(signaturesByGroup).forEach((signatureMap) => {
    signatureMap.forEach((entryIds) => {
      const added = entryIds.filter((id) => byId.get(id)?.operation === "added");
      const removed = entryIds.filter((id) => byId.get(id)?.operation === "removed");
      if (added.length === 1 && removed.length === 1) {
        const addedEntry = byId.get(added[0]);
        const removedEntry = byId.get(removed[0]);
        if (addedEntry) {
          addedEntry.changeClass = "moved_or_renamed";
          addedEntry.severity = "medium";
        }
        if (removedEntry) {
          removedEntry.changeClass = "moved_or_renamed";
          removedEntry.severity = "medium";
        }
      }
    });
  });

  return entries;
}

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
