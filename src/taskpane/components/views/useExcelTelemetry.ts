import { useState, useEffect } from "react";

/* global Excel console */

export function useExcelTelemetry() {
  const [activeSheet, setActiveSheet] = useState<string>("_Study");
  const [isCodelistActive, setIsCodelistActive] = useState<boolean>(false);

  useEffect(() => {
    let sheetActivatedHandler: any;
    let selectionChangedHandler: any;

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

              // eslint-disable-next-line office-addins/call-sync-after-load, office-addins/call-sync-before-read
              setActiveSheet(sheet.name);
              setIsCodelistActive(false); // Reset sidecar on sheet change
            });
          });

          // Listener 2: Cell Selection Changed (Trigger for Sidecar)
          selectionChangedHandler = workbook.onSelectionChanged.add(async () => {
            await Excel.run(async (ctx) => {
              const range = ctx.workbook.getSelectedRange();
              range.load(["columnIndex", "worksheet/name"]);
              await ctx.sync();

              // eslint-disable-next-line office-addins/call-sync-after-load, office-addins/call-sync-before-read
              const sheetName = range.worksheet.name;

              // Context Trigger: If on a CRF sheet AND in the Codelist ID col (Index 7 / Col H)
              // eslint-disable-next-line office-addins/call-sync-after-load, office-addins/call-sync-before-read
              if (!sheetName.startsWith("_") && range.columnIndex === 7) {
                setIsCodelistActive(true);
              } else {
                setIsCodelistActive(false);
              }
            });
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
    };
  }, []);

  return { activeSheet, isCodelistActive };
}
