/* global Excel */
/**
 * @issue #46, #93, #41
 */
import { LinguisticService } from "./linguistics-service";

export interface CodelistItem {
  codedValue: string;
  decodedText: Record<string, string>;
}

export interface CodelistGroup {
  id: string;
  name: string;
  items: CodelistItem[];
}

/**
 * Reads the _Codelists sheet and transforms flat rows into grouped JSON objects.
 */
export async function fetchDictionaries(): Promise<CodelistGroup[]> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");
    await context.sync();
    if (sheet.isNullObject) return [];

    const range = sheet.getUsedRange();
    range.load("values");
    await context.sync();

    const vals = range.values;
    if (!vals || vals.length <= 1) return [];

    const headers = vals[0].map((h: any) => String(h || "").trim());
    const localeMap = new Map<string, number>();
    let idIdx = -1,
      nameIdx = -1,
      codeIdx = -1,
      decodeIdx = -1;

    headers.forEach((h, idx) => {
      const normalized = h.toLowerCase();
      if (normalized === "id" || normalized === "codelist id") idIdx = idx;
      else if (normalized === "name" || normalized === "codelist name") nameIdx = idx;
      else if (normalized === "code") codeIdx = idx;
      else if (normalized === "decode") decodeIdx = idx;
      else {
        const match = LinguisticService.discoverLocaleFromHeader(h);
        if (match && match.type === "decode") {
          localeMap.set(match.locale, idx);
        }
      }
    });

    // Fallback if no headers found
    if (idIdx === -1) {
      idIdx = 0;
      nameIdx = 1;
      codeIdx = 2;
      decodeIdx = 3;
    }

    const groups: Record<string, CodelistGroup> = {};

    // Skip header row (index 0)
    for (let i = 1; i < vals.length; i++) {
      const row = vals[i];
      const id = row[idIdx];
      if (!id) continue;

      const strId = String(id).trim();
      if (!groups[strId]) {
        groups[strId] = { id: strId, name: String(row[nameIdx] || ""), items: [] };
      }

      const decodedText: Record<string, string> = {};
      // Base decode (if any)
      if (decodeIdx !== -1 && row[decodeIdx]) {
        decodedText["en-US"] = String(row[decodeIdx]); // Assuming en-US as default if not specified
      }

      // Dynamic locales
      localeMap.forEach((idx, locale) => {
        if (row[idx]) {
          decodedText[locale] = String(row[idx]);
        }
      });

      groups[strId].items.push({
        codedValue: String(row[codeIdx] || ""),
        decodedText,
      });
    }

    return Object.values(groups);
  });
}

/**
 * Injects the selected Codelist ID into the active Excel cell.
 */
export async function insertDictionaryToActiveCell(codelistId: string): Promise<void> {
  return await Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.values = [[codelistId]];
    await context.sync();
  });
}

/**
 * Writes a newly created dictionary to the bottom of the _Codelists sheet
 * and updates the Named Range for Data Validation dropdowns.
 */
export async function saveNewDictionary(
  id: string,
  name: string,
  items: CodelistItem[]
): Promise<void> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem("_Codelists");
    const range = sheet.getUsedRange();
    range.load(["values", "rowCount", "columnCount"]);
    await context.sync();

    const headers = range.values[0].map((h: any) => String(h || "").trim());
    const localeMap = new Map<string, number>();
    let idIdx = -1,
      nameIdx = -1,
      codeIdx = -1,
      decodeIdx = -1;

    headers.forEach((h, idx) => {
      const normalized = h.toLowerCase();
      if (normalized === "id" || normalized === "codelist id") idIdx = idx;
      else if (normalized === "name" || normalized === "codelist name") nameIdx = idx;
      else if (normalized === "code") codeIdx = idx;
      else if (normalized === "decode") decodeIdx = idx;
      else {
        const match = LinguisticService.discoverLocaleFromHeader(h);
        if (match && match.type === "decode") {
          localeMap.set(match.locale, idx);
        }
      }
    });

    // Fallback if no headers
    if (idIdx === -1) {
      idIdx = 0;
      nameIdx = 1;
      codeIdx = 2;
      decodeIdx = 3;
    }

    // Collect all locales present in items
    const allLocales = new Set<string>();
    items.forEach((item) => {
      Object.keys(item.decodedText).forEach((l) => {
        if (l !== "en-US") allLocales.add(l);
      });
    });

    // Ensure headers for all locales exist
    let maxColIdx = Math.max(
      range.columnCount - 1,
      idIdx,
      nameIdx,
      codeIdx,
      decodeIdx,
      ...Array.from(localeMap.values())
    );

    allLocales.forEach((locale) => {
      if (!localeMap.has(locale)) {
        if (locale === "en-US" && decodeIdx !== -1) {
          localeMap.set("en-US", decodeIdx);
        } else {
          maxColIdx++;
          const newHeader = `Decode (${locale})`;
          const headerRange = sheet.getRangeByIndexes(
            range.rowIndex,
            range.columnIndex + maxColIdx,
            1,
            1
          );
          headerRange.values = [[newHeader]];
          localeMap.set(locale, maxColIdx);
        }
      }
    });

    // Build 2D array for new rows
    const rowCount = items.length;
    const finalColCount = maxColIdx + 1;
    const newRows: any[][] = Array.from({ length: rowCount }, () => Array(finalColCount).fill(""));

    items.forEach((item, idx) => {
      newRows[idx][idIdx] = id.toUpperCase();
      if (nameIdx !== -1) newRows[idx][nameIdx] = name;
      if (codeIdx !== -1) newRows[idx][codeIdx] = item.codedValue;

      // Map translations to columns
      Object.entries(item.decodedText).forEach(([locale, text]) => {
        let colIdx = localeMap.get(locale);
        // If en-US and we have a standard Decode column, use it if no specific en-US column exists
        if (locale === "en-US" && colIdx === undefined && decodeIdx !== -1) {
          colIdx = decodeIdx;
        }

        if (colIdx !== undefined) {
          newRows[idx][colIdx] = text;
        }
      });
    });

    const insertRange = sheet.getRangeByIndexes(
      range.rowIndex + range.rowCount,
      range.columnIndex,
      rowCount,
      finalColCount
    );
    insertRange.values = newRows;

    // Expand the Named Range so native Excel dropdowns immediately see the new ID
    // We start from the row after the header (range.rowIndex + 1)
    // The total number of data rows is (range.rowCount + rowCount - 1)
    const dataRowCount = range.rowCount + rowCount - 1;
    context.workbook.names.add(
      "CodelistDictionary",
      sheet.getRangeByIndexes(range.rowIndex + 1, range.columnIndex + idIdx, dataRowCount, 1)
    );

    await context.sync();
  });
}
