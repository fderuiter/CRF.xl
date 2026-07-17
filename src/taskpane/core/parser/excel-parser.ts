/// <reference types="office-js" />
import { ChunkingEngine } from "../engine/chunking-engine";
/* global Excel, window, Worker, URL, MessageEvent */
/**
 * @issue #53, #118, #137, #28
 */

import { StudyDesign } from "../types/index";
import { ParseRuntimeOptions } from "./chunking-runtime";
import { parseRawDataToStudyDesign } from "./parser-engine";
import { DiagnosticError } from "../services/diagnostic-framework";

interface ParseExcelToStudyDesignOptions extends ParseRuntimeOptions {
  allowPartialSheetFailures?: boolean;
}

export async function parseExcelToStudyDesign(
  options: ParseExcelToStudyDesignOptions = {}
): Promise<{
  studyDesign: StudyDesign;
  validationIssues: import("../types").ValidationIssue[];
}> {
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
): Promise<Record<string, unknown[][]>> {
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

    const rawData: Record<string, unknown[][]> = {};
    const rangesInfo: {
      name: string;
      sheet: Excel.Worksheet;
      range: Excel.Range;
      tables: Excel.TableCollection;
    }[] = [];

    for (const sheet of sheets.items) {
      // Check cancellation during setup
      if (options.signal?.aborted) {
        throw new Error("Parsing cancelled during Excel extraction");
      }
      // Attempt to load table first
      const tables = sheet.tables;
      tables.load("count");

      const range = sheet.getUsedRangeOrNullObject();
      range.load(["rowIndex", "columnIndex", "rowCount", "columnCount", "isNullObject"]);
      rangesInfo.push({ name: sheet.name, sheet, range, tables });
    }

    // Execute single batch fetch to get all dimensions and table counts
    await context.sync();

    for (const info of rangesInfo) {
      if (info.tables.count > 0) {
        const table = info.tables.getItemAt(0);
        const tableRange = table.getRange();
        tableRange.load(["rowIndex", "columnIndex", "rowCount", "columnCount"]);
        info.range = tableRange; // Override with table range to respect Table schema
      }
    }
    await context.sync();

    let totalRows = 0;
    for (const info of rangesInfo) {
      if (!info.range.isNullObject) {
        totalRows += info.range.rowCount;
      }
    }

    let completedRows = 0;

    const engine = new ChunkingEngine<null>({ chunkSize: PAGE_SIZE });

    const fetchSheetData = async (
      info: (typeof rangesInfo)[0],
      totalRows: number,
      completedRowsRef: { value: number }
    ) => {
      const rows = info.range.rowCount;
      const cols = info.range.columnCount;
      const startR = info.range.rowIndex;
      const startC = info.range.columnIndex;

      const sheetData: unknown[][] = [];
      const dummyData = new Array(rows).fill(null);

      await engine.execute([{ id: info.name, data: dummyData }], async (chunk, cCtx) => {
        if (options.signal?.aborted) {
          throw new Error("Parsing cancelled during Excel extraction");
        }

        const pageRows = chunk.length;
        const subRange = info.sheet.getRangeByIndexes(
          startR + cCtx.startIndex,
          startC,
          pageRows,
          cols
        );
        subRange.load("values");

        await context.sync();

        sheetData.push(...subRange.values);
        completedRowsRef.value += pageRows;

        if (options.onProgress) {
          options.onProgress({
            phase: "metadata",
            completed: completedRowsRef.value,
            total: totalRows || 1,
            message: `Extracting data from ${info.name}...`,
          });
        }
      });

      return sheetData;
    };

    for (const info of rangesInfo) {
      if (info.range.isNullObject || info.range.rowCount === 0 || info.range.columnCount === 0) {
        continue;
      }

      rawData[info.name] = await fetchSheetData(info, totalRows, { value: completedRows });
      completedRows += info.range.rowCount;
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
  rawData: Record<string, unknown[][]>,
  options: ParseExcelToStudyDesignOptions
): Promise<{
  studyDesign: StudyDesign;
  validationIssues: import("../types").ValidationIssue[];
}> {
  return new Promise((resolve, reject) => {
    // Webpack 5 standard worker creation
    // @ts-ignore: import.meta.url is supported by Webpack 5 but not by Jest/ts-jest with current config
    const worker = new Worker(new URL("../worker/engine.worker.ts", import.meta.url));

    const onAbort = () => {
      worker.postMessage({ type: "CANCEL_PARSING" });
    };

    if (options.signal) {
      options.signal.addEventListener("abort", onAbort);
      if (options.signal.aborted) {
        onAbort();
      }
    }

    const cleanup = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", onAbort);
      }
      worker.terminate();
    };

    // Handle incoming messages
    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === "PROGRESS") {
        if (options.onProgress) {
          options.onProgress(payload);
        }
      } else if (type === "SUCCESS") {
        cleanup();
        resolve(payload);
      } else if (type === "ERROR") {
        cleanup();
        if (payload && typeof payload === "object" && "category" in payload) {
          reject(DiagnosticError.fromJSON(payload));
        } else {
          reject(new Error(String(payload)));
        }
      } else if (type === "CANCELLED") {
        cleanup();
        reject(new Error("Parsing cancelled"));
      }
    };

    worker.onerror = (error) => {
      cleanup();
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
