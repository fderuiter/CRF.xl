/* global Excel, window, Worker, URL, MessageEvent */
import { StudyDesign } from "../types/index";
import { ParseRuntimeOptions } from "./chunking-runtime";
import { parseRawDataToStudyDesign } from "./parser-engine";

export interface ParseExcelToStudyDesignOptions extends ParseRuntimeOptions {
  allowPartialSheetFailures?: boolean;
}

export async function parseExcelToStudyDesign(
  options: ParseExcelToStudyDesignOptions = {}
): Promise<StudyDesign> {
  const rawData = await fetchRawDataFromExcel(options);

  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    // 2. Delegate to Worker
    return await runInWorker(rawData, options);
  } else {
    // 3. Fallback to main thread execution
    return await parseRawDataToStudyDesign(rawData, options);
  }
}

async function fetchRawDataFromExcel(
  options: ParseExcelToStudyDesignOptions
): Promise<Record<string, any[][]>> {
  if (options.onProgress) {
    options.onProgress({
      phase: "metadata",
      completed: 0,
      total: 1,
      message: "Extracting raw data from Excel host...",
    });
  }

  return await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    const rawData: Record<string, any[][]> = {};
    const ranges: { name: string; range: Excel.Range }[] = [];

    for (const sheet of sheets.items) {
      // Check cancellation during setup
      if (options.cancellationToken?.isCancelled()) {
        throw new Error("Parsing cancelled during Excel extraction");
      }
      const range = sheet.getUsedRangeOrNullObject();
      range.load("values");
      ranges.push({ name: sheet.name, range });
    }

    // Execute single batch fetch
    await context.sync();

    for (const r of ranges) {
      if (!r.range.isNullObject) {
        rawData[r.name] = r.range.values;
      }
    }

    if (options.onProgress) {
      options.onProgress({
        phase: "metadata",
        completed: 1,
        total: 1,
        message: "Excel data extraction complete",
      });
    }

    return rawData;
  });
}

function runInWorker(
  rawData: Record<string, any[][]>,
  options: ParseExcelToStudyDesignOptions
): Promise<StudyDesign> {
  return new Promise((resolve, reject) => {
    // Webpack 5 standard worker creation
    const worker = new Worker(new URL("../worker/engine.worker.ts", import.meta.url));

    // Handle incoming messages
    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === "PROGRESS") {
        if (options.onProgress) {
          options.onProgress(payload);
        }
        // Proxy cancellation state to the worker
        if (options.cancellationToken?.isCancelled()) {
          worker.postMessage({ type: "CANCEL_PARSING" });
        }
      } else if (type === "SUCCESS") {
        worker.terminate();
        resolve(payload as StudyDesign);
      } else if (type === "ERROR") {
        worker.terminate();
        reject(new Error(payload));
      } else if (type === "CANCELLED") {
        worker.terminate();
        reject(new Error("Parsing cancelled"));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    // Serialize options (without functions) to pass to worker
    const serializableOptions = {
      chunkSize: options.chunkSize,
      timeoutMs: options.timeoutMs,
      allowPartialSheetFailures: options.allowPartialSheetFailures,
    };

    // Start parsing
    worker.postMessage({
      type: "START_PARSING",
      payload: {
        rawData,
        options: serializableOptions,
      },
    });
  });
}
