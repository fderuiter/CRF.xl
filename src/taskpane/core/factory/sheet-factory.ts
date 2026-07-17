/// <reference types="office-js" />
/* global Excel */
/**
 * @issue #292
 */
import { SHEET_HEADERS, SYSTEM_SHEETS } from "../registry/sheet-metadata-registry";

export async function upgradeSystemSheetsToTables(context: Excel.RequestContext): Promise<void> {
  const sheetInfos = Array.from(SYSTEM_SHEETS).map((name) => ({
    name,
    sheet: context.workbook.worksheets.getItemOrNullObject(name),
    tables: null as Excel.TableCollection | null,
    usedRange: null as Excel.Range | null,
  }));

  for (const info of sheetInfos) {
    info.sheet.load("isNullObject");
  }
  await context.sync();

  const activeSheets = sheetInfos.filter((i) => !i.sheet.isNullObject);
  for (const info of activeSheets) {
    info.tables = info.sheet.tables;
    info.tables.load("count");
  }
  await context.sync();

  const toUpgrade = activeSheets.filter((i) => i.tables && i.tables.count === 0);
  for (const info of toUpgrade) {
    info.usedRange = info.sheet.getUsedRange();
    info.usedRange.load(["address", "rowCount"]);
  }
  await context.sync();

  for (const info of toUpgrade) {
    if (info.usedRange && info.usedRange.rowCount > 0) {
      // Clear manual header styles before upgrading to let Table Style take over
      const headerRange = info.usedRange.getRow(0);
      headerRange.format.fill.clear();
      headerRange.format.font.color = "Automatic";

      const table = info.sheet.tables.add(info.usedRange, true);
      table.name = `${info.name.replace(/[^A-Za-z0-9_]/g, "")}Table`;
      table.style = "Slate 900";
    }
  }
  if (toUpgrade.length > 0) {
    await context.sync();
  }
}

export async function createOrClearSystemSheet(
  context: Excel.RequestContext,
  sheetName: string,
  data?: any[][]
): Promise<Excel.Worksheet> {
  const sheets = context.workbook.worksheets;
  let sheet = sheets.getItemOrNullObject(sheetName);
  sheet.load("isNullObject");
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
