/**
 * @issue #130, #85
 */
/* eslint-disable office-addins/call-sync-before-read, office-addins/load-object-before-read */
import ExcelJS from "exceljs";
import { parseRawDataToStudyDesign } from "../parser/parser-engine";
import { StudyDesign } from "../types";

const MAX_BASELINE_WORKBOOK_BYTES = 20 * 1024 * 1024;

export class BaselineWorkbookParseError extends Error {
  public readonly userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "BaselineWorkbookParseError";
    Object.setPrototypeOf(this, BaselineWorkbookParseError.prototype);
    this.userMessage = userMessage ?? message;
  }
}

export interface BaselineWorkbookFileLike {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export async function parseBaselineWorkbookFile(
  file: BaselineWorkbookFileLike
): Promise<StudyDesign> {
  if (!file) {
    throw new BaselineWorkbookParseError("No baseline workbook selected.");
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new BaselineWorkbookParseError(
      `Unsupported baseline workbook extension for "${file.name}".`,
      "Please select a valid .xlsx CRF.xl workbook."
    );
  }

  if (typeof file.size === "number" && file.size > MAX_BASELINE_WORKBOOK_BYTES) {
    throw new BaselineWorkbookParseError(
      `Baseline workbook "${file.name}" exceeds ${MAX_BASELINE_WORKBOOK_BYTES} bytes.`,
      "Selected baseline workbook is too large to load in the taskpane."
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    return await parseBaselineWorkbookBuffer(buffer, file.name);
  } catch (error) {
    if (error instanceof BaselineWorkbookParseError) {
      throw error;
    }
    throw new BaselineWorkbookParseError(
      `Failed reading baseline workbook "${file.name}": ${error instanceof Error ? error.message : String(error)}`,
      "Could not read the selected baseline workbook."
    );
  }
}

export async function parseBaselineWorkbookBuffer(
  buffer: ArrayBuffer,
  sourceName = "baseline workbook"
): Promise<StudyDesign> {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    throw new BaselineWorkbookParseError(
      `Failed parsing workbook bytes from ${sourceName}: ${error instanceof Error ? error.message : String(error)}`,
      "Selected file is not a valid .xlsx workbook."
    );
  }

  const requiredSheets = ["_Study", "_Forms"];
  const missingSheets = requiredSheets.filter((sheetName) => !workbook.getWorksheet(sheetName));
  if (missingSheets.length > 0) {
    throw new BaselineWorkbookParseError(
      `Workbook ${sourceName} is missing required sheets: ${missingSheets.join(", ")}`,
      `Workbook is not compatible with CRF.xl (missing ${missingSheets.join(", ")}).`
    );
  }

  const rawData: Record<string, any[][]> = {};
  workbook.eachSheet((worksheet) => {
    rawData[worksheet.name] = worksheetToValues(worksheet);
  });

  const study = await parseRawDataToStudyDesign(rawData);

  if (Object.keys(study.forms).length === 0) {
    throw new BaselineWorkbookParseError(
      `Workbook ${sourceName} produced zero forms during parsing.`,
      "Baseline workbook could not be parsed into a valid CRF.xl study design."
    );
  }

  return study;
}

function worksheetToValues(worksheet: ExcelJS.Worksheet): unknown[][] {
  const rows: unknown[][] = [];

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const worksheetRow = worksheet.getRow(rowNumber);
    const values = Array.isArray(worksheetRow.values) ? worksheetRow.values.slice(1) : [];
    const normalized = values.map((value) => normalizeCellValue(value));
    let lastNonEmpty = normalized.length - 1;
    while (lastNonEmpty >= 0 && isEmptyCellValue(normalized[lastNonEmpty])) {
      lastNonEmpty -= 1;
    }
    rows.push(normalized.slice(0, lastNonEmpty + 1));
  }

  while (rows.length > 0 && rows[rows.length - 1].every((value) => isEmptyCellValue(value))) {
    rows.pop();
  }

  return rows;
}

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const candidate = value as {
      result?: unknown;
      text?: unknown;
      richText?: Array<{ text?: unknown }>;
      formula?: unknown;
    };
    if (candidate.result !== undefined && candidate.result !== null) return candidate.result;
    if (Array.isArray(candidate.richText)) {
      return candidate.richText
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("");
    }
    if (typeof candidate.text === "string") return candidate.text;
    if (candidate.formula !== undefined && candidate.formula !== null) {
      return String(candidate.formula);
    }
  }
  return value;
}

function isEmptyCellValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}
