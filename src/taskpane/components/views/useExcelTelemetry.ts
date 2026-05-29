/* eslint-disable no-undef, office-addins/call-sync-before-read, office-addins/call-sync-after-load */
import { useState, useEffect } from "react";

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
              if (!sheetName.startsWith("_") && range.columnIndex === 9) {
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
