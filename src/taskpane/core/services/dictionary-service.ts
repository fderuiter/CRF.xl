/* global Excel */
/**
 * @issue #46, #93, #41
 */
import { LinguisticService } from "./linguistics-service";
import { CodelistItem as CoreCodelistItem } from "../types/clinical";
import { groupBy } from "../utils/collection-utils";
import { ChunkingEngine, ExecutionPlan } from "../engine/chunking-engine";
import { announcer } from "./announcer";

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
  let allRows: any[] = [];
  let idIdx = -1,
    nameIdx = -1,
    codeIdx = -1,
    decodeIdx = -1;
  const localeMap = new Map<string, number>();

  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItemOrNullObject("_Codelists");
    sheet.load("isNullObject");
    await context.sync();
    if (sheet.isNullObject) return;

    const { tables } = sheet;
    tables.load("count");
    await context.sync();

    let rangeInfo: Excel.Range;
    if (tables.count > 0) {
      rangeInfo = tables.getItemAt(0).getRange();
    } else {
      rangeInfo = sheet.getUsedRange();
    }

    rangeInfo.load(["rowCount", "columnCount", "rowIndex", "columnIndex"]);
    await context.sync();

    if (rangeInfo.rowCount <= 1) return;

    const rowCount = rangeInfo.rowCount;
    const colCount = rangeInfo.columnCount;
    const rowIndex = rangeInfo.rowIndex;
    const colIndex = rangeInfo.columnIndex;

    const headerRange = sheet.getRangeByIndexes(rowIndex, colIndex, 1, colCount);
    headerRange.load("values");
    await context.sync();

    const vals = headerRange.values;
    const headers = vals[0].map((h: unknown) => String(h || "").trim());

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

    if (idIdx === -1) {
      idIdx = 0;
      nameIdx = 1;
      codeIdx = 2;
      decodeIdx = 3;
    }

    const engine = new ChunkingEngine<number>({ chunkSize: 500 });
    engine.on("progress", (p: any) => {
      const pct = Math.round((p.completed / p.total) * 100);
      announcer.announce(`Loading dictionary: ${pct}% complete`);
    });

    const dataRowCount = rowCount - 1;
    const plan: ExecutionPlan<number> = {
      id: "fetch_dictionaries",
      data: Array.from({ length: dataRowCount }, (_, i) => i + 1),
    };

    await engine.execute([plan], async (chunk) => {
      const chunkRange = sheet.getRangeByIndexes(
        rowIndex + chunk[0],
        colIndex,
        chunk.length,
        colCount
      );
      chunkRange.load("values");
      await context.sync();
      allRows.push(...chunkRange.values);
    });
  });

  if (allRows.length === 0) return [];

  const validRows = allRows.filter((row: any) => row[idIdx]);
  const groupedMap = groupBy(validRows, (row: any) => String(row[idIdx]).trim());

  return Array.from(groupedMap.entries()).map(([strId, rows]) => {
    const items = rows.map((row: any) => {
      const decodedText: Record<string, string> = {};
      if (decodeIdx !== -1 && row[decodeIdx]) {
        decodedText["en-US"] = String(row[decodeIdx]);
      }
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
    const { tables } = sheet;
    tables.load("count");
    await context.sync();

    let range: Excel.Range;
    if (tables.count > 0) {
      const table = tables.getItemAt(0);
      range = table.getRange();
    } else {
      range = sheet.getUsedRange();
    }

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

    if (idIdx === -1) {
      idIdx = 0;
      nameIdx = 1;
      codeIdx = 2;
      decodeIdx = 3;
    }

    const allLocales = new Set<string>();
    items.forEach((item) => {
      Object.keys(item.decodedText).forEach((l) => {
        if (l !== "en-US") allLocales.add(l);
      });
    });

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

    const rowCount = items.length;
    const finalColCount = maxColIdx + 1;
    const itemRows: any[][] = Array.from({ length: rowCount }, () => Array(finalColCount).fill(""));

    items.forEach((item, idx) => {
      itemRows[idx][idIdx] = id.toUpperCase();
      if (nameIdx !== -1) itemRows[idx][nameIdx] = name;
      if (codeIdx !== -1) itemRows[idx][codeIdx] = item.codedValue;

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

    const engine = new ChunkingEngine<any[]>({ chunkSize: 500 });
    engine.on("progress", (p: any) => {
      const pct = Math.round((p.completed / p.total) * 100);
      announcer.announce(`Saving dictionary: ${pct}% complete`);
    });

    const plan: ExecutionPlan<any[]> = {
      id: "save_dictionary",
      data: itemRows,
    };

    if (isNew) {
      let currentRowOffset = rangeRowIndex + rangeRowCount;
      await engine.execute([plan], async (chunk) => {
        const chunkRange = sheet.getRangeByIndexes(
          currentRowOffset,
          rangeColumnIndex,
          chunk.length,
          finalColCount
        );
        chunkRange.values = chunk;
        currentRowOffset += chunk.length;
        await context.sync();
      });
    } else {
      const existingVals = rangeValues;
      const normalizedId = id.toUpperCase();
      const firstRowToReplace = existingVals.findIndex(
        (r, idx) => idx > 0 && String(r[idIdx]).trim().toUpperCase() === normalizedId
      );

      if (firstRowToReplace !== -1) {
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

        const insertRange = sheet.getRangeByIndexes(
          rangeRowIndex + firstRowToReplace,
          rangeColumnIndex,
          rowCount,
          finalColCount
        );
        insertRange.insert(Excel.InsertShiftDirection.down);

        let currentRowOffset = rangeRowIndex + firstRowToReplace;
        await engine.execute([plan], async (chunk) => {
          const chunkRange = sheet.getRangeByIndexes(
            currentRowOffset,
            rangeColumnIndex,
            chunk.length,
            finalColCount
          );
          chunkRange.values = chunk;
          currentRowOffset += chunk.length;
          await context.sync();
        });
      }
    }

    const dataRowCount = rangeRowCount + (isNew ? rowCount : 0) - 1;
    context.workbook.names.add(
      "CodelistDictionary",
      sheet.getRangeByIndexes(rangeRowIndex + 1, rangeColumnIndex + idIdx, dataRowCount, 1)
    );

    await context.sync();
    announcer.announce("Dictionary saved successfully");
  });
}
