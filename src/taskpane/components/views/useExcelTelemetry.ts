/**
 * @issue #28
 */
/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { bindingService } from "../../core/services/binding-service";

export function useExcelTelemetry() {
  const [activeSheet, setActiveSheet] = useState<string>("_Study");
  const [isCodelistActive, setIsCodelistActive] = useState<boolean>(false);
  const [telemetryTrigger, setTelemetryTrigger] = useState<number>(0);

  useEffect(() => {
    // 1. Initialize global binding service
    bindingService.initialize().catch(console.error);

    // 2. Subscribe to normalized selection changes
    const unsubscribe = bindingService.subscribe((context) => {
      setActiveSheet(context.sheetName);

      // Context Trigger: If on a CRF sheet AND in the Codelist ID col (Index 9 / Col J)
      const shouldShowSidecar =
        !context.sheetName.startsWith("_") && context.columnIndex === 9 && context.isValid;
      setIsCodelistActive(shouldShowSidecar);

      setTelemetryTrigger((prev) => prev + 1);
    });

    // 3. Keep data change listener for general telemetry (non-selection updates)
    let dataChangedHandler: any;
    Excel.run(async (context) => {
      dataChangedHandler = context.workbook.worksheets.onChanged.add(async () => {
        setTelemetryTrigger((prev) => prev + 1);
      });
      await context.sync();
    }).catch(console.error);

    return () => {
      unsubscribe();
      if (dataChangedHandler) dataChangedHandler.remove();
      // Only terminate if we want to release global listeners when this hook unmounts.
      // Usually, since it's used in App.tsx, this only happens on refresh.
      // bindingService.terminate().catch(console.error);
    };
  }, []);

  return { activeSheet, isCodelistActive, telemetryTrigger };
}
