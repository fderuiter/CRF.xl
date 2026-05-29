/* global Excel, window, Worker, URL, MessageEvent */
/**
 * @issue #53, #118, #137
 */

import { StudyDesign } from "../types/index";
import { ParseRuntimeOptions } from "./chunking-runtime";
import { parseRawDataToStudyDesign } from "./parser-engine";

export interface ParseExcelToStudyDesignOptions extends ParseRuntimeOptions {
  allowPartialSheetFailures?: boolean;
}

export async function parseExcelToStudyDesign(
  options: ParseExcelToStudyDesignOptions = {}
): Promise<{ studyDesign: StudyDesign; validationIssues: import("../parser/validator").ValidationIssue[] }> {
  const rawData = await fetchRawDataFromExcel(options);

  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    // 2. Delegate to Worker
    return await runInWorker(rawData, options);
  } else {
    // 3. Fallback to main thread execution
    const studyDesign = await parseRawDataToStudyDesign(rawData, options);
    const { validateStudyDesign } = await import("../parser/validator");
    const validationIssues = await validateStudyDesign(studyDesign);
    return { studyDesign, validationIssues };
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

  const PAGE_SIZE = 500;

  return await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    const rawData: Record<string, any[][]> = {};
    const rangesInfo: { name: string; sheet: Excel.Worksheet; range: Excel.Range }[] = [];

    for (const sheet of sheets.items) {
      // Check cancellation during setup
      if (options.cancellationToken?.isCancelled()) {
        throw new Error("Parsing cancelled during Excel extraction");
      }
      const range = sheet.getUsedRangeOrNullObject();
      range.load(["rowIndex", "columnIndex", "rowCount", "columnCount"]);
      rangesInfo.push({ name: sheet.name, sheet, range });
    }

    // Execute single batch fetch to get all dimensions
    await context.sync();

    let totalRows = 0;
    for (const info of rangesInfo) {
      if (!info.range.isNullObject) {
        totalRows += info.range.rowCount;
      }
    }

    let completedRows = 0;

    for (const info of rangesInfo) {
      if (info.range.isNullObject) {
        continue;
      }

      const rows = info.range.rowCount;
      const cols = info.range.columnCount;
      const startR = info.range.rowIndex;
      const startC = info.range.columnIndex;

      const sheetData: any[][] = [];

      for (let i = 0; i < rows; i += PAGE_SIZE) {
        if (options.cancellationToken?.isCancelled()) {
          throw new Error("Parsing cancelled during Excel extraction");
        }

        const pageRows = Math.min(PAGE_SIZE, rows - i);
        const subRange = info.sheet.getRangeByIndexes(startR + i, startC, pageRows, cols);
        subRange.load("values");

        await context.sync();

        sheetData.push(...subRange.values);
        completedRows += pageRows;

        if (options.onProgress) {
          options.onProgress({
            phase: "metadata",
            completed: completedRows,
            total: totalRows || 1,
            message: `Extracting data from ${info.name}...`,
          });
        }

        // Cooperative yield to keep UI thread responsive
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      rawData[info.name] = sheetData;
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
): Promise<{ studyDesign: StudyDesign; validationIssues: import("../parser/validator").ValidationIssue[] }> {
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
        resolve(payload);
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
