/* global Excel */
import { SHEET_HEADERS } from "../registry/sheet-metadata-registry";

export async function createOrClearSystemSheet(
  context: Excel.RequestContext,
  sheetName: string,
  data?: any[][]
): Promise<Excel.Worksheet> {
  const sheets = context.workbook.worksheets;
  let sheet = sheets.getItemOrNullObject(sheetName);
  await context.sync();

  if (sheet.isNullObject) {
    sheet = sheets.add(sheetName);
  } else {
    sheet.getUsedRange().clear();
  }

  const headers = SHEET_HEADERS[sheetName as keyof typeof SHEET_HEADERS];
  if (headers && headers.length > 0) {
    const headerRange = sheet.getRangeByIndexes(0, 0, 1, headers.length);
    headerRange.values = [headers];

    // Apply Standard Theme: Slate 900 background, white bold text
    headerRange.format.fill.color = "#1e293b";
    headerRange.format.font.color = "white";
    headerRange.format.font.bold = true;

    if (data && data.length > 0) {
      const dataRange = sheet.getRangeByIndexes(1, 0, data.length, headers.length);
      dataRange.values = data;
    }

    headerRange.format.autofitColumns();
    sheet.freezePanes.freezeRows(1);
  }

  return sheet;
}

export function applyThemeToHeader(headerRange: Excel.Range): void {
  headerRange.format.fill.color = "#1e293b";
  headerRange.format.font.color = "white";
  headerRange.format.font.bold = true;
  headerRange.format.autofitColumns();
}
