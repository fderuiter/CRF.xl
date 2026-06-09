/**
 * @issue #28
 */
/* eslint-disable no-undef, office-addins/call-sync-before-read, office-addins/call-sync-after-load */
import { useState, useEffect } from "react";
import { isClinicalWorksheet, isCodelistColumn } from "../../core/utils/clinical-utils";
import { EXCEL_COLUMNS, WORKSHEET_PREFIXES } from "../../core/constants";

/**
 * Exposes Excel worksheet and selection activity to drive telemetry and sidecar activation.
 *
 * Subscribes to workbook events (worksheet activation, selection change, and worksheet data changes),
 * keeps `activeSheet` synchronized with the current worksheet name, sets `isCodelistActive` when the
 * current selection matches the codelist context, and increments `telemetryTrigger` on relevant changes.
 *
 * @returns An object with:
 * - `activeSheet` — the name of the currently active worksheet.
 * - `isCodelistActive` — `true` when the current selection indicates the codelist sidecar should be active, `false` otherwise.
 * - `telemetryTrigger` — a counter incremented to signal telemetry updates.
 */
export function useExcelTelemetry() {
  const [activeSheet, setActiveSheet] = useState<string>("_Study");
  const [isCodelistActive, setIsCodelistActive] = useState<boolean>(false);
  const [telemetryTrigger, setTelemetryTrigger] = useState<number>(0);

  useEffect(() => {
    let sheetActivatedHandler: any;
    let selectionChangedHandler: any;
    let dataChangedHandler: any;

    const setupTelemetry = async () => {
      try {
        await Excel.run(async (context) => {
          const workbook = context.workbook;

          // Set initial state based on what is currently open
          const activeWorksheet = workbook.worksheets.getActiveWorksheet();
          activeWorksheet.load("name");
          await context.sync();
          setActiveSheet(activeWorksheet.name);

          // Listener 1: Worksheet Switched
          sheetActivatedHandler = workbook.worksheets.onActivated.add(async () => {
            await Excel.run(async (ctx) => {
              const sheet = ctx.workbook.worksheets.getActiveWorksheet();
              sheet.load("name");
              await ctx.sync();
              setActiveSheet(sheet.name);
              setIsCodelistActive(false); // Reset sidecar on sheet change
              setTelemetryTrigger(prev => prev + 1);
            });
          });

          // Listener 2: Cell Selection Changed (Trigger for Sidecar)
          selectionChangedHandler = workbook.onSelectionChanged.add(async () => {
            await Excel.run(async (ctx) => {
              const range = ctx.workbook.getSelectedRange();
              const worksheet = range.worksheet;
              worksheet.load("name");
              range.load("columnIndex");
              await ctx.sync();

              const sheetName = worksheet.name;

              // Context Trigger: If on a CRF sheet AND in the Codelist ID col (Index 9 / Col J)
              if (isClinicalWorksheet(sheetName, WORKSHEET_PREFIXES.SYSTEM) && isCodelistColumn(range.columnIndex, EXCEL_COLUMNS.CODELIST_ID)) {
                setIsCodelistActive(true);
              } else {
                setIsCodelistActive(false);
              }
              setTelemetryTrigger(prev => prev + 1);
            });
          });

          // Listener 3: Data Changed (Values updated)
          dataChangedHandler = workbook.worksheets.onChanged.add(async () => {
            setTelemetryTrigger(prev => prev + 1);
          });

          await context.sync();
        });
      } catch (error) {
        console.error("Failed to bind Excel Telemetry", error);
      }
    };

    setupTelemetry();

    return () => {
      // Clean up listeners to prevent memory leaks when React unmounts
      if (sheetActivatedHandler) sheetActivatedHandler.remove();
      if (selectionChangedHandler) selectionChangedHandler.remove();
      if (dataChangedHandler) dataChangedHandler.remove();
    };
  }, []);

  return { activeSheet, isCodelistActive, telemetryTrigger };
}
