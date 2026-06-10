/**
 * @issue #28
 */
import { StudyDiffListEntry, StudyDiffReport, DiffEntityGroup, DiffChangeClass, DiffSeverity } from "../types/diff";

export const inferSeverity = (operation: "added" | "removed" | "modified"): DiffSeverity => {
  if (operation === "removed") return "high";
  if (operation === "modified") return "medium";
  return "low";
};

export const stableStringifyWithoutKeys = (value: unknown, omittedKeys: string[]): string => {
  const omit = new Set(omittedKeys);

  const normalize = (val: unknown): unknown => {
    if (val === null || val === undefined) return val;
    if (typeof val !== "object") return val;
    if (Array.isArray(val)) return val.map(normalize);

    const obj = val as Record<string, unknown>;
    const normalized = Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => !omit.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, normalize(value)])
    );
    return normalized;
  };

  const normalized = normalize(value);
  return JSON.stringify(normalized);
};

export const detectMovedOrRenamed = (
  entries: StudyDiffListEntry[],
  report: StudyDiffReport
): StudyDiffListEntry[] => {
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
};

export const isClinicalWorksheet = (sheetName: string, prefix: string): boolean => {
  return !sheetName.startsWith(prefix);
};

export const isCodelistColumn = (columnIndex: number, targetIndex: number): boolean => {
  return columnIndex === targetIndex;
};
