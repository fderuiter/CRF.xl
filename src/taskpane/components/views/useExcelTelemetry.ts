/* eslint-disable no-undef, office-addins/call-sync-before-read, office-addins/call-sync-after-load */
import { useState, useEffect } from "react";

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
              setActiveSheet(sheet.name);
              setIsCodelistActive(false); // Reset sidecar on sheet change
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

              // Context Trigger: If on a CRF sheet AND in the Codelist ID col (Index 7 / Col H)
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
