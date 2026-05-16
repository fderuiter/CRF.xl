import { StudyDesign } from '../../core/types';

export type MatrixRequiredFilter = 'all' | 'required' | 'optional';

export interface MatrixSearchFilters {
    search: string;
    required: MatrixRequiredFilter;
    dataType: string;
    visit: string;
}

export interface MatrixSearchableItem {
    itemOid: string;
    itemLabel: string;
    dataType: string;
    required: boolean;
    searchIndex: string;
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
    items: MatrixSearchableItem[];
    searchIndex: string;
}

export interface MatrixSearchResult {
    entry: MatrixSearchEntry;
    matchedFields: string[];
    previewItems: MatrixSearchableItem[];
    matchedItemCount: number;
}

const DEFAULT_PREVIEW_COUNT = 3;

export function normalizeMatrixSearch(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function includesSearch(value: string, search: string): boolean {
    return normalizeMatrixSearch(value).includes(search);
}

function getMatchedFields(entry: MatrixSearchEntry, search: string): string[] {
    if (!search) {
        return [];
    }

    const matchedFields = new Set<string>();

    if (includesSearch(entry.formOid, search)) {
        matchedFields.add('Form OID');
    }
    if (includesSearch(entry.formName, search)) {
        matchedFields.add('Form Name');
    }
    if (includesSearch(entry.eventName, search)) {
        matchedFields.add('Visit');
    }
    if (entry.items.some((item) => includesSearch(item.itemOid, search))) {
        matchedFields.add('Variable OID');
    }
    if (entry.items.some((item) => includesSearch(item.itemLabel, search))) {
        matchedFields.add('Variable Label');
    }

    return Array.from(matchedFields);
}

function filterEntryItems(entry: MatrixSearchEntry, filters: MatrixSearchFilters, normalizedSearch: string): MatrixSearchableItem[] {
    return entry.items.filter((item) => {
        if (filters.required === 'required' && !item.required) {
            return false;
        }
        if (filters.required === 'optional' && item.required) {
            return false;
        }
        if (filters.dataType !== 'all' && item.dataType !== filters.dataType) {
            return false;
        }
        if (!normalizedSearch) {
            return true;
        }
        return item.searchIndex.includes(normalizedSearch);
    });
}

export function buildMatrixSearchEntries(study: StudyDesign): MatrixSearchEntry[] {
    const entries: MatrixSearchEntry[] = [];
    const formIndexes = new Map<string, Omit<MatrixSearchEntry, 'id' | 'eventOid' | 'eventName' | 'searchIndex'>>();

    Object.values(study.forms)
        .sort((left, right) => left.orderNumber - right.orderNumber)
        .forEach((form) => {
            const items = form.itemGroups
                .flatMap((group) => group.items)
                .map((item) => {
                    const itemOid = item.itemOid || item.name || '';
                    const itemLabel = item.label?.['en-US'] || item.name || item.itemOid || '';
                    const dataType = item.dataType || 'Unspecified';
                    const required = !!item.validation?.required;

                    return {
                        itemOid,
                        itemLabel,
                        dataType,
                        required,
                        searchIndex: normalizeMatrixSearch([itemOid, itemLabel, dataType].join(' ')),
                    };
                });

            formIndexes.set(form.formOid, {
                formOid: form.formOid,
                formName: form.formName,
                itemCount: items.length,
                requiredCount: items.filter((item) => item.required).length,
                optionalCount: items.filter((item) => !item.required).length,
                dataTypes: Array.from(new Set(items.map((item) => item.dataType))).sort((left, right) => left.localeCompare(right)),
                items,
            });
        });

    study.events
        .slice()
        .sort((left, right) => left.orderNumber - right.orderNumber)
        .forEach((event) => {
            event.forms
                .slice()
                .sort((left, right) => left.orderNumber - right.orderNumber)
                .forEach((formRef) => {
                    const formIndex = formIndexes.get(formRef.formOid);
                    if (!formIndex) {
                        return;
                    }

                    entries.push({
                        ...formIndex,
                        id: `${event.eventOid}:${formIndex.formOid}`,
                        eventOid: event.eventOid,
                        eventName: event.eventName,
                        searchIndex: normalizeMatrixSearch([
                            formIndex.formOid,
                            formIndex.formName,
                            event.eventOid,
                            event.eventName,
                            ...formIndex.items.map((item) => `${item.itemOid} ${item.itemLabel}`),
                        ].join(' ')),
                    });
                });
        });

    return entries;
}

export function filterMatrixEntries(entries: MatrixSearchEntry[], filters: MatrixSearchFilters): MatrixSearchResult[] {
    const normalizedSearch = normalizeMatrixSearch(filters.search);

    return entries.reduce<MatrixSearchResult[]>((results, entry) => {
        if (filters.visit !== 'all' && entry.eventOid !== filters.visit) {
            return results;
        }

        const previewItems = filterEntryItems(entry, filters, normalizedSearch);
        const hasMatchingItems = previewItems.length > 0;
        const hasSearchMatch = !normalizedSearch || entry.searchIndex.includes(normalizedSearch);

        if (!hasSearchMatch) {
            return results;
        }

        if ((filters.required !== 'all' || filters.dataType !== 'all') && !hasMatchingItems) {
            return results;
        }

        results.push({
            entry,
            matchedFields: getMatchedFields(entry, normalizedSearch),
            previewItems: (hasMatchingItems ? previewItems : entry.items).slice(0, DEFAULT_PREVIEW_COUNT),
            matchedItemCount: hasMatchingItems ? previewItems.length : entry.items.length,
        });

        return results;
    }, []);
}
