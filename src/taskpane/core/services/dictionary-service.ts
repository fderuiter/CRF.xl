/* global Excel */
/**
 * @issue #46, #93, #41
 */
import { LinguisticService } from "./linguistics-service";
import { CodelistItem as CoreCodelistItem } from "../types/clinical";
import { groupBy } from "../utils/collection-utils";

export type CodelistItem = Pick<CoreCodelistItem, "codedValue" | "decodedText">;

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

    const headers = vals[0].map((h: unknown) => String(h || "").trim());
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

    const validRows = vals.slice(1).filter((row: any) => row[idIdx]);
    const groupedMap = groupBy(validRows, (row: any) => String(row[idIdx]).trim());

    return Array.from(groupedMap.entries()).map(([strId, rows]) => {
      const items = rows.map((row: any) => {
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

        return {
          codedValue: String(row[codeIdx] || ""),
          decodedText,
        };
      });

      return {
        id: strId,
        name: String(rows[0][nameIdx] || ""),
        items,
      };
    });
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
/**
 * Updates an existing dictionary or saves a new one.
 */
export async function saveDictionary(
  id: string,
  name: string,
  items: CodelistItem[],
  isNew = true
): Promise<void> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem("_Codelists");
    const range = sheet.getUsedRange();
    range.load(["values", "rowCount", "columnCount", "rowIndex", "columnIndex"]);
    await context.sync();

    const rangeRowIndex = range.rowIndex;
    const rangeColumnIndex = range.columnIndex;
    const rangeRowCount = range.rowCount;
    const rangeColumnCount = range.columnCount;
    const rangeValues = range.values;

    const headers = rangeValues[0].map((h: unknown) => String(h || "").trim());
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
      rangeColumnCount - 1,
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
            rangeRowIndex,
            rangeColumnIndex + maxColIdx,
            1,
            1
          );
          headerRange.values = [[newHeader]];
          localeMap.set(locale, maxColIdx);
        }
      }
    });

    // Build 2D array for rows
    const rowCount = items.length;
    const finalColCount = maxColIdx + 1;
    const itemRows: (string | number | boolean)[][] = Array.from({ length: rowCount }, () => Array(finalColCount).fill(""));

    items.forEach((item, idx) => {
      itemRows[idx][idIdx] = id.toUpperCase();
      if (nameIdx !== -1) itemRows[idx][nameIdx] = name;
      if (codeIdx !== -1) itemRows[idx][codeIdx] = item.codedValue;

      // Map translations to columns
      Object.entries(item.decodedText).forEach(([locale, text]) => {
        let colIdx = localeMap.get(locale);
        if (locale === "en-US" && colIdx === undefined && decodeIdx !== -1) {
          colIdx = decodeIdx;
        }

        if (colIdx !== undefined) {
          itemRows[idx][colIdx] = text;
        }
      });
    });

    if (isNew) {
      // Append at bottom
      const insertRange = sheet.getRangeByIndexes(
        rangeRowIndex + rangeRowCount,
        rangeColumnIndex,
        rowCount,
        finalColCount
      );
      insertRange.values = itemRows;
    } else {
      // Find and replace existing rows
      const existingVals = rangeValues;
      const normalizedId = id.toUpperCase();
      const firstRowToReplace = existingVals.findIndex(
        (r, idx) => idx > 0 && String(r[idIdx]).trim().toUpperCase() === normalizedId
      );

      if (firstRowToReplace !== -1) {
        // Find how many rows to delete
        let rowsToDelete = 0;
        for (let i = firstRowToReplace; i < existingVals.length; i++) {
          if (String(existingVals[i][idIdx]).trim().toUpperCase() === normalizedId) {
            rowsToDelete++;
          } else {
            break;
          }
        }

        const deleteRange = sheet.getRangeByIndexes(
          rangeRowIndex + firstRowToReplace,
          rangeColumnIndex,
          rowsToDelete,
          finalColCount
        );
        deleteRange.delete(Excel.DeleteShiftDirection.up);

        // Insert new rows at the same position
        const insertRange = sheet.getRangeByIndexes(
          rangeRowIndex + firstRowToReplace,
          rangeColumnIndex,
          rowCount,
          finalColCount
        );
        insertRange.insert(Excel.InsertShiftDirection.down);
        insertRange.values = itemRows;
      }
    }

    // Expand the Named Range so native Excel dropdowns immediately see the new ID
    // We start from the row after the header (rangeRowIndex + 1)
    // The total number of data rows is (rangeRowCount + rowCount - 1)
    const dataRowCount = rangeRowCount + (isNew ? rowCount : 0) - 1;
    context.workbook.names.add(
      "CodelistDictionary",
      sheet.getRangeByIndexes(rangeRowIndex + 1, rangeColumnIndex + idIdx, dataRowCount, 1)
    );

    await context.sync();
  });
}
