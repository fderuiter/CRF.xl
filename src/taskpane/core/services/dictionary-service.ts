/* global Excel */

export interface CodelistItem {
  codedValue: string;
  decode: string;
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

    const groups: Record<string, CodelistGroup> = {};

    // Skip header row (index 0)
    for (let i = 1; i < vals.length; i++) {
      const [id, name, value, decode] = vals[i];
      if (!id) continue;

      const strId = String(id).trim();
      if (!groups[strId]) {
        groups[strId] = { id: strId, name: String(name || ""), items: [] };
      }
      groups[strId].items.push({
        codedValue: String(value || ""),
        decode: String(decode || ""),
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

    // Build 2D array for new rows
    const newRows = items.map((item) => [id.toUpperCase(), name, item.codedValue, item.decode]);

    // Find the next empty row
    const usedRange = sheet.getUsedRange();
    usedRange.load("rowCount");
    await context.sync();

    const nextRow = usedRange.rowCount;
    const insertRange = sheet.getRangeByIndexes(nextRow, 0, newRows.length, 4);
    insertRange.values = newRows;

    // Expand the Named Range so native Excel dropdowns immediately see the new ID
    const finalRowCount = nextRow + newRows.length;
    context.workbook.names.add(
      "CodelistDictionary",
      sheet.getRangeByIndexes(1, 0, finalRowCount - 1, 1)
    );

    await context.sync();
  });
}
