/* global Excel */
/**
 * @issue #68
 */

import { CRF_VARIABLE_TYPE_OPTIONS } from "@crf-xl/core/parser/form-element-utils";

import { DATA_ORIGIN_OPTIONS } from "@crf-xl/core/parser/metadata-utils";


import { getLocaleConfig } from "@crf-xl/core/locale-config";


import { SHEET_NAMES, getDefaultData } from "@crf-xl/core/registry/sheet-metadata-registry";

import { createOrClearSystemSheet } from "../factory/sheet-factory";

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

/**
 * 1. INITIALIZE WORKBOOK (The Scaffolder)
 * Creates the locked System Control sheets and builds the Named Ranges.
 */
export async function initializeWorkbook(): Promise<void> {
  return await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;

    // Ensure clean slate
    const existingNames = context.workbook.names;
    existingNames.load("items");
    await context.sync();

    const locale = getLocaleConfig().currentLocale;

    // System Control Sheets Definition
    const controlSheetsToInitialize = [
      SHEET_NAMES.STUDY,
      SHEET_NAMES.FORMS,
      SHEET_NAMES.SCHEDULE,
      SHEET_NAMES.CODELISTS,
      SHEET_NAMES.METHODS,
      SHEET_NAMES.RULES,
    ];

    for (const sheetName of controlSheetsToInitialize) {
      const data = getDefaultData(sheetName, locale);
      await createOrClearSystemSheet(context, sheetName, data);
    }

    // TASK 1.1: Dynamic Codelist Dropdowns (Named Range)
    // We map a massive range to future-proof EDC scale dictionaries.
    const clSheet = sheets.getItem("_Codelists");
    context.workbook.names.add("CodelistDictionary", clSheet.getRange("A2:A10000"));

    await context.sync();

    // Auto-trigger the Warp Engine to generate the initial DEMO and VS sheets
    await syncRegistryInternal(context);

    sheets.getItem("_Study").activate();
    await context.sync();
  });
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

async function syncRegistryInternal(context: Excel.RequestContext): Promise<void> {
  const sheets = context.workbook.worksheets;
  const formsSheet = sheets.getItem("_Forms");
  const scheduleSheet = sheets.getItem("_Schedule");
  formsSheet.load("protection/protected");
  scheduleSheet.load("protection/protected");
  await context.sync();

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
      crfSheet = sheets.add(oid);

      // Layout Authoring Interface
      const navRange = crfSheet.getRange("A1");
      navRange.values = [["[ ← Back to Registry ]"]];
      navRange.format.font.color = "#2563eb";
      navRange.format.font.bold = true;
      // Add return warp link
      navRange.hyperlink = { textToDisplay: "[ ← Back to Registry ]", address: "#'_Forms'!A1" };

      const headers = [
        "Variable Name",
        "Label",
        "Variable Type",
        "Required",
        "Length",
        "Significant Digits",
        "Minimum",
        "Maximum",
        "Show If",
        "Codelist ID",
        "Origin",
        "Method OID",
        "SDTM Domain",
        "SDTM Variable",
        "Comment",
      ];
      const headerRange = crfSheet.getRangeByIndexes(1, 0, 1, headers.length);
      headerRange.values = [headers];
      headerRange.format.fill.color = "#2563eb"; // Blue 600 for Authoring
      headerRange.format.font.color = "white";
      headerRange.format.font.bold = true;

      // Apply Contextual Data Validations
      crfSheet.getRange("C3:C1000").dataValidation.rule = {
        list: {
          inCellDropDown: true,
          source: CRF_VARIABLE_TYPE_OPTIONS.join(","),
        },
      };
      crfSheet.getRange("D3:D1000").dataValidation.rule = {
        list: { inCellDropDown: true, source: "Yes,No" },
      };

      // Connect to Dynamic Codelist Named Range
      crfSheet.getRange("J3:J1000").dataValidation.rule = {
        list: { inCellDropDown: true, source: "=CodelistDictionary" },
      };

      // Apply Origin Validation to Column K
      crfSheet.getRange("K3:K1000").dataValidation.rule = {
        list: {
          inCellDropDown: true,
          source: DATA_ORIGIN_OPTIONS.join(","),
        },
      };

      headerRange.format.autofitColumns();
      crfSheet.freezePanes.freezeRows(2);
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
