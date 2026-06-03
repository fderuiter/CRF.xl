/* global Excel */
/**
 * @issue #68
 */

import { CRF_VARIABLE_TYPE_OPTIONS } from "./form-element-utils";
import { DATA_ORIGIN_OPTIONS } from "./metadata-utils";

import { getLocaleConfig } from "../locale-config";

interface SheetProtectionConfig {
  sheetName: "_Forms" | "_Schedule";
  protectionArea: string;
  editableRanges: string[];
  lockedRanges: string[];
}

export function getSheetProtectionConfigs(): SheetProtectionConfig[] {
  return [
    {
      sheetName: "_Forms",
      protectionArea: "A1:XFD1000",
      editableRanges: ["A2:D1000"],
      lockedRanges: ["A1:D1"],
    },
    {
      sheetName: "_Schedule",
      protectionArea: "A1:XFD1000",
      editableRanges: ["B2:XFD1000"],
      lockedRanges: ["A1:XFD1", "A2:A1000"],
    },
  ];
}

import { BootstrapService } from "../services/bootstrap-service";

/**
 * 1. INITIALIZE WORKBOOK (The Scaffolder)
 * Creates the locked System Control sheets and builds the Named Ranges.
 */
export async function initializeWorkbook(): Promise<void> {
  await BootstrapService.bootstrap(true);
}

/**
 * 2. SYNC REGISTRY (The Warp Navigation Engine)
 * Reads the _Forms registry, spawns missing CRF sheets, links formulas, and draws bi-directional hyperlinks.
 */
export async function syncRegistry(): Promise<void> {
  return await Excel.run(async (context) => {
    await syncRegistryInternal(context);
  });
}

export async function syncRegistryInternal(context: Excel.RequestContext): Promise<void> {
  const sheets = context.workbook.worksheets;
  const formsSheet = sheets.getItemOrNullObject("_Forms");
  const scheduleSheet = sheets.getItemOrNullObject("_Schedule");
  formsSheet.load("isNullObject, protection/protected");
  scheduleSheet.load("isNullObject, protection/protected");
  await context.sync();

  // Safety check: return early if scaffolded sheets don't exist
  if (formsSheet.isNullObject || scheduleSheet.isNullObject) {
    console.warn("syncRegistry: Scaffolded sheets (_Forms or _Schedule) not found. Bootstrap required.");
    return;
  }

  if (formsSheet.protection.protected) {
    formsSheet.protection.unprotect();
  }

  if (scheduleSheet.protection.protected) {
    scheduleSheet.protection.unprotect();
  }

  const usedRange = formsSheet.getUsedRange();
  usedRange.load(["values", "rowCount"]);
  await context.sync();

  const vals = usedRange.values;
  const rowCount = usedRange.rowCount;

  // TASK 1.2: Matrix Formula Sync
  // We inject absolute formulas into _Schedule so it mirrors _Forms exactly.
  if (rowCount > 1) {
    const scheduleFormulas = [];
    for (let i = 1; i < rowCount; i++) {
      scheduleFormulas.push([`='_Forms'!A${i + 1}`]);
    }
    const scheduleRange = scheduleSheet.getRangeByIndexes(1, 0, rowCount - 1, 1);
    scheduleRange.formulasLocal = scheduleFormulas;
    scheduleRange.format.font.bold = true;
    scheduleRange.format.fill.color = "#f8fafc"; // Light slate to indicate formula
  }

  // TASK 1.3: "Warp" Navigation Engine
  for (let i = 1; i < rowCount; i++) {
    const oid = String(vals[i][0]).trim();
    if (!oid) continue;

    let crfSheet = sheets.getItemOrNullObject(oid);
    await context.sync();

    // 3a. Spawn Missing Sheets
    if (crfSheet.isNullObject) {
      crfSheet = await BootstrapService.bootstrapFormSheet(context, oid);
    }

    // 3b. Draw Outbound Warp Link in _Forms
    // Re-assign hyperlink to ensure it points to the correct sheet (using single quotes for safety)
    const cell = formsSheet.getRangeByIndexes(i, 0, 1, 1);
    cell.hyperlink = { textToDisplay: oid, address: `#'${oid}'!A1` };
  }

  const protectionConfigs = getSheetProtectionConfigs();
  for (const config of protectionConfigs) {
    const sheet = config.sheetName === "_Forms" ? formsSheet : scheduleSheet;
    sheet.getRange(config.protectionArea).format.protection.locked = true;

    for (const rangeAddress of config.editableRanges) {
      sheet.getRange(rangeAddress).format.protection.locked = false;
    }

    for (const rangeAddress of config.lockedRanges) {
      sheet.getRange(rangeAddress).format.protection.locked = true;
    }

    sheet.protection.protect({ selectionMode: "Unlocked" });
  }

  await context.sync();
}

/**
 * Jump focus to a specific cell in Excel.
 */
export async function navigateToSource(sheetName: string, rowIndex: number): Promise<void> {
  return await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    sheet.activate();
    sheet.getRangeByIndexes(rowIndex, 0, 1, 1).select();
    await context.sync();
  });
}
