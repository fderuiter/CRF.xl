/* global Excel */
/**
 * @issue #39, #86
 */
import { TranslatableItem } from "./linguistic-service";
import { TranslationUnit } from "../types";

/**
 * Persists a translation back to the Excel workbook.
 */
export async function persistTranslation(
  item: TranslatableItem,
  locale: string,
  unit: TranslationUnit
): Promise<void> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(item.location.sheetName);
    const isCodelist = item.location.sheetName === "_Codelists";
    const headerRowIndex = isCodelist ? 0 : 1;

    // 1. Find the target column
    const headerRange = sheet.getRangeByIndexes(headerRowIndex, 0, 1, 100);
    headerRange.load("values");
    await context.sync();

    const headers = headerRange.values[0] as string[];
    const targetHeader = `${item.location.columnHeader} (${locale})`;
    let colIndex = headers.findIndex(
      (h) => String(h || "").toLowerCase().trim() === targetHeader.toLowerCase().trim()
    );

    if (colIndex === -1) {
      // Find the first empty column in the header row to append
      colIndex = headers.findIndex((h) => !h || String(h).trim() === "");
      if (colIndex === -1) colIndex = headers.length;

      const newHeaderCell = sheet.getRangeByIndexes(headerRowIndex, colIndex, 1, 1);
      newHeaderCell.values = [[targetHeader]];
      newHeaderCell.format.fill.color = isCodelist ? "#1e293b" : "#2563eb";
      newHeaderCell.format.font.color = "white";
      newHeaderCell.format.font.bold = true;
    }

    // 2. Find the target row
    let rowIndex = -1;
    const usedRange = sheet.getUsedRange();
    usedRange.load("values");
    await context.sync();
    const allValues = usedRange.values;

    if (item.location.itemOid) {
      // CRF Item: Search by Variable Name
      const varNameCol = headers.findIndex(
        (h) => String(h || "").toLowerCase().trim() === "variable name"
      );
      if (varNameCol !== -1) {
        for (let i = headerRowIndex + 1; i < allValues.length; i++) {
          if (
            String(allValues[i][varNameCol]).trim().toUpperCase() ===
            item.location.itemOid.toUpperCase()
          ) {
            rowIndex = i;
            break;
          }
        }
      }
    } else if (item.location.codelistId && item.location.codedValue !== undefined) {
      // Codelist Item: Search by ID and Code
      const idCol = headers.findIndex(
        (h) => String(h || "").toLowerCase().trim() === "codelist id"
      );
      const codeCol = headers.findIndex((h) => String(h || "").toLowerCase().trim() === "coded value");
      if (idCol !== -1 && codeCol !== -1) {
        for (let i = headerRowIndex + 1; i < allValues.length; i++) {
          if (
            String(allValues[i][idCol]).trim().toUpperCase() ===
              item.location.codelistId.toUpperCase() &&
            String(allValues[i][codeCol]).trim() === String(item.location.codedValue).trim()
          ) {
            rowIndex = i;
            break;
          }
        }
      }
    }

    // Fallback to recorded rowIndex if search fails (less safe)
    if (rowIndex === -1) {
      rowIndex = item.location.rowIndex;
    }

    // 3. Write the value
    const cell = sheet.getRangeByIndexes(rowIndex, colIndex, 1, 1);
    cell.values = [[unit.value]];

    await context.sync();
  });
}
