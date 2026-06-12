/**
 * @issue #28
 */
import { StudyDesign, isCrfItem, DataType } from "../../core/types";

export type MatrixRequiredFilter = "all" | "required" | "optional";

export interface MatrixSearchFilters {
  search: string;
  required: MatrixRequiredFilter;
  dataType: string;
  visit: string;
}

interface MatrixIndexedItem {
  itemOid: string;
  itemLabel: string;
  dataType: string;
  required: boolean;
  searchText: string;
}

export interface MatrixSearchEntry {
  id: string;
  eventOid: string;
  eventName: string;
  formOid: string;
  formName: string;
  itemCount: number;
  requiredCount: number;
  optionalCount: number;
  dataTypes: string[];
  previewItems: string[];
  searchText: string;
  items: MatrixIndexedItem[];
}

const PREVIEW_LIMIT = 3;

export function normalizeMatrixSearch(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildMatrixSearchIndex(study: StudyDesign): MatrixSearchEntry[] {
  return study.events
    .slice()
    .sort((left, right) => left.orderNumber - right.orderNumber)
    .flatMap((event) =>
      event.forms
        .slice()
        .sort((left, right) => left.orderNumber - right.orderNumber)
        .map((formRef): MatrixSearchEntry | null => {
          const form = study.forms[formRef.formOid];
          if (!form) return null;

          const items = form.itemGroups.flatMap((group) =>
            group.items.filter(isCrfItem).map((item) => {
              const itemOid = item.itemOid || item.name || "";
              const itemLabel = item.label?.["en-US"] || item.name || item.itemOid || "";
              const dataType = item.dataType || "Unspecified";
              return {
                itemOid,
                itemLabel,
                dataType,
                required: !!item.validation?.required,
                searchText: normalizeMatrixSearch(`${itemOid} ${itemLabel} ${dataType}`),
              };
            })
          );

          return {
            id: `${event.eventOid}:${form.formOid}`,
            eventOid: event.eventOid,
            eventName: event.eventName,
            formOid: form.formOid,
            formName: form.formName,
            itemCount: items.length,
            requiredCount: items.filter((item) => item.required).length,
            optionalCount: items.filter((item) => !item.required).length,
            dataTypes: Array.from(new Set(items.map((item) => item.dataType))).sort((left, right) =>
              left.localeCompare(right)
            ),
            previewItems: items
              .slice(0, PREVIEW_LIMIT)
              .map((item) => `${item.itemOid} — ${item.itemLabel}`),
            searchText: normalizeMatrixSearch(
              `${form.formOid} ${form.formName} ${event.eventOid} ${event.eventName} ${items
                .map((item) => `${item.itemOid} ${item.itemLabel}`)
                .join(" ")}`
            ),
            items,
          };
        })
        .filter((entry): entry is MatrixSearchEntry => entry !== null)
    );
}

export function filterMatrixSearchIndex(
  entries: MatrixSearchEntry[],
  filters: MatrixSearchFilters
): MatrixSearchEntry[] {
  const normalizedSearch = normalizeMatrixSearch(filters.search);

  return entries.reduce<MatrixSearchEntry[]>((results, entry) => {
    if (filters.visit !== "all" && entry.eventOid !== filters.visit) {
      return results;
    }

    const matchingItems = entry.items.filter((item) => {
      if (filters.required === "required" && !item.required) return false;
      if (filters.required === "optional" && item.required) return false;
      if (filters.dataType !== "all" && item.dataType !== filters.dataType) return false;
      if (!normalizedSearch) return true;
      return item.searchText.includes(normalizedSearch);
    });

    if (normalizedSearch && !entry.searchText.includes(normalizedSearch)) {
      return results;
    }

    if ((filters.required !== "all" || filters.dataType !== "all") && matchingItems.length === 0) {
      return results;
    }

    const previewSource = matchingItems.length > 0 ? matchingItems : entry.items;

    results.push({
      ...entry,
      previewItems: previewSource
        .slice(0, PREVIEW_LIMIT)
        .map((item) => `${item.itemOid} — ${item.itemLabel}`),
    });

    return results;
  }, []);
}
