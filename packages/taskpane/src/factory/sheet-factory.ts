/* global Excel */
/**
 * @issue #292
 */
import { SHEET_HEADERS, SYSTEM_SHEETS } from "@crf-xl/core/registry/sheet-metadata-registry";


export async function upgradeSystemSheetsToTables(context: Excel.RequestContext): Promise<void> {
  for (const sheetName of SYSTEM_SHEETS) {
    const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
    await context.sync();
    if (sheet.isNullObject) continue;

    const tables = sheet.tables;
    tables.load("count");
    await context.sync();

    if (tables.count === 0) {
      const usedRange = sheet.getUsedRange();
      usedRange.load("address, rowCount");
      await context.sync();

      if (usedRange.rowCount > 0) {
        // Clear manual header styles before upgrading to let Table Style take over
        const headerRange = usedRange.getRow(0);
        headerRange.format.fill.clear();
        headerRange.format.font.color = "Automatic";

        const table = sheet.tables.add(usedRange, true);
        table.name = `${sheetName.replace(/[^A-Za-z0-9_]/g, "")}Table`;
        table.style = "Slate 900";

        await context.sync();
      }
    }
  }
}

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
    const rowCount = data && data.length > 0 ? data.length + 1 : 2;
    let colStr = "";
    let c = headers.length - 1;
    while (c >= 0) {
      colStr = String.fromCharCode(65 + (c % 26)) + colStr;
      c = Math.floor(c / 26) - 1;
    }
    const rangeAddress = `A1:${colStr}${rowCount}`;

    const table = sheet.tables.add(rangeAddress, true);
    table.name = `${sheetName.replace(/[^A-Za-z0-9_]/g, "")}Table`;
    table.style = "Slate 900";

    const headerRange = table.getHeaderRowRange();
    headerRange.values = [headers];

    if (data && data.length > 0) {
      const dataRange = table.getDataBodyRange();
      dataRange.values = data;
    }

    headerRange.format.autofitColumns();
    sheet.freezePanes.freezeRows(1);
  }

  return sheet;
}

export function applyThemeToHeader(_headerRange: Excel.Range): void {
  // Deprecated: Themes are now handled via native Table Styles.
}
