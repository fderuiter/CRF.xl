/** @jest-environment node */
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { mapRowToFormElement } from "../../src/taskpane/core/parser/form-element-utils";
import { validateStudyDesign } from "../../src/taskpane/core/parser/validator";
import {
  DataType,
  EventType,
  StudyDesign,
  isCrfDisplayBlock,
  isCrfItem,
} from "../../src/taskpane/core/types";

export const displayBlocksFixturePath = path.resolve(
  __dirname,
  "../fixtures/display-blocks/display-blocks-fixture.xlsx"
);

export const expectedDisplayBlocksOdmPath = path.resolve(
  __dirname,
  "../fixtures/display-blocks/expected-odm.xml"
);

export const expectedDisplayBlocksDocxPath = path.resolve(
  __dirname,
  "../fixtures/display-blocks/display-blocks-paper-crf.docx"
);

export const expectedDisplayBlocksDocxXmlPath = path.resolve(
  __dirname,
  "../fixtures/display-blocks/expected-docx-document.xml"
);

export async function parseDisplayBlocksFixture(): Promise<StudyDesign> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(displayBlocksFixturePath);

  const studyRows = worksheetRows(workbook.getWorksheet("_Study")!);
  const study: StudyDesign = {
    metadata: {
      protocolId: String(studyRows[1]?.[0] ?? "PROT-XXXX"),
      studyName: String(studyRows[1]?.[1] ?? "Untitled"),
      version: String(studyRows[1]?.[2] ?? "1.0"),
      defaultLanguage: String(studyRows[1]?.[3] ?? "en-US"),
    },
    events: [],
    forms: {},
    codelists: {},
  };

  const codelistRows = worksheetRows(workbook.getWorksheet("_Codelists")!);
  for (let rowIndex = 1; rowIndex < codelistRows.length; rowIndex += 1) {
    const [id, name, code, decode] = codelistRows[rowIndex] ?? [];
    if (!id) {
      continue;
    }

    const codelistId = String(id).trim().toUpperCase();
    if (!study.codelists[codelistId]) {
      study.codelists[codelistId] = {
        codelistId,
        codelistName: String(name ?? codelistId),
        dataType: DataType.TEXT,
        items: [],
      };
    }

    study.codelists[codelistId].items.push({
      codelistId,
      codedValue: String(code ?? ""),
      decodedText: { "en-US": String(decode ?? "") },
      orderNumber: study.codelists[codelistId].items.length + 1,
    });
  }

  const formsRows = worksheetRows(workbook.getWorksheet("_Forms")!);
  const formOids: string[] = [];
  for (let rowIndex = 1; rowIndex < formsRows.length; rowIndex += 1) {
    const [id, name, repeating] = formsRows[rowIndex] ?? [];
    if (!id) {
      continue;
    }

    const formOid = String(id).trim();
    formOids.push(formOid);
    study.forms[formOid] = {
      formOid,
      formName: String(name ?? formOid),
      orderNumber: rowIndex,
      repeating:
        String(repeating ?? "")
          .trim()
          .toLowerCase() === "yes",
      effectiveVersion: study.metadata.version,
      itemGroups: [
        {
          groupOid: `${formOid}_GRP`,
          name: "Default Group",
          repeating: false,
          orderNumber: 1,
          items: [],
        },
      ],
    };
  }

  for (const formOid of formOids) {
    const worksheet = workbook.getWorksheet(formOid);
    if (!worksheet) {
      continue;
    }

    const rows = worksheetRows(worksheet);
    const headers = (rows[0] ?? []).map((header) => String(header ?? ""));
    const group = study.forms[formOid].itemGroups[0];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const element = mapRowToFormElement(headers, rows[rowIndex] ?? [], formOid, rowIndex + 1);

      if (isCrfDisplayBlock(element as any)) {
        group.items.push(element as any);
        continue;
      }

      const item = element as any;
      if (!isCrfItem(item) || !item.itemOid) {
        continue;
      }

      group.items.push({
        ...item,
        nodeType: "item",
        groupOid: group.groupOid,
        orderNumber: group.items.filter(isCrfItem).length + 1,
        effectiveVersion: study.metadata.version,
        dataType: normalizeDataType(item.dataType),
      } as any);
    }
  }

  const scheduleRows = worksheetRows(workbook.getWorksheet("_Schedule")!);
  const scheduleHeaders = (scheduleRows[0] ?? []).map((value) => String(value ?? ""));
  for (let columnIndex = 1; columnIndex < scheduleHeaders.length; columnIndex += 1) {
    const eventName = scheduleHeaders[columnIndex].trim();
    if (!eventName) {
      continue;
    }

    const forms = [];
    for (let rowIndex = 1; rowIndex < scheduleRows.length; rowIndex += 1) {
      const formOid = String(scheduleRows[rowIndex]?.[0] ?? "").trim();
      const marker = String(scheduleRows[rowIndex]?.[columnIndex] ?? "")
        .trim()
        .toUpperCase();
      if (marker === "X" || marker === "1") {
        forms.push({ formOid, orderNumber: forms.length + 1, mandatory: true });
      }
    }

    study.events.push({
      eventOid: `VISIT_${columnIndex}`,
      eventName,
      orderNumber: columnIndex,
      eventType: EventType.SCHEDULED,
      forms,
    });
  }

  return study;
}

export function extractDocxDocumentXml(docxPath: string): string {
  return execFileSync("unzip", ["-p", docxPath, "word/document.xml"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function collectDisplayBlocks(study: StudyDesign) {
  return Object.values(study.forms)
    .flatMap((form) => form.itemGroups)
    .flatMap((group) => group.items)
    .filter(isCrfDisplayBlock);
}

export async function collectValidationMessages(study: StudyDesign): Promise<string[]> {
  return (await validateStudyDesign(study)).map((issue) => issue.message);
}

function worksheetRows(worksheet: ExcelJS.Worksheet): unknown[][] {
  return worksheet
    .getSheetValues()
    .slice(1)
    .map((row) => (Array.isArray(row) ? row.slice(1) : []));
}

function normalizeDataType(value: unknown): DataType {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  switch (normalized) {
    case "integer":
      return DataType.INTEGER;
    case "float":
      return DataType.FLOAT;
    case "date":
      return DataType.DATE;
    case "time":
      return DataType.TIME;
    case "datetime":
      return DataType.DATETIME;
    case "boolean":
      return DataType.BOOLEAN;
    case "codelist":
      return DataType.CODELIST;
    default:
      return DataType.TEXT;
  }
}
