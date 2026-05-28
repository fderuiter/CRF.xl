// @ts-nocheck
/** @jest-environment node */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import ExcelJS from "exceljs";
import { generateOdmXml } from "../../src/taskpane/core/generators/cdisc/odm-builder";
import { DataType, EventType, StudyDesign } from "../../src/taskpane/core/types";

const fixturePath = path.resolve(
  __dirname,
  "../fixtures/reference-study/reference-study.xlsx"
);

const schemaPath = path.resolve(
  __dirname,
  "../fixtures/reference-study/cdisc-schema/cdisc-odm-1.3.2/ODM1-3-2-foundation.xsd"
);

const expectedXmlPath = path.resolve(
  __dirname,
  "../fixtures/reference-study/expected-odm.xml"
);

function mapDataType(raw: unknown): DataType {
  const value = String(raw ?? "").trim().toLowerCase();
  switch (value) {
    case "integer":
      return DataType.INTEGER;
    case "float":
      return DataType.FLOAT;
    case "date":
      return DataType.DATE;
    case "datetime":
      return DataType.DATETIME;
    case "boolean":
      return DataType.BOOLEAN;
    default:
      return DataType.TEXT;
  }
}

function worksheetRows(worksheet: ExcelJS.Worksheet): unknown[][] {
  return worksheet
    .getSheetValues()
    .slice(1)
    .map((row) => (Array.isArray(row) ? row.slice(1) : []));
}

function assertReferenceStudyRequirements(workbook: ExcelJS.Workbook): void {
  const formsRows = worksheetRows(workbook.getWorksheet("_Forms")!);
  const formNames = new Set(formsRows.slice(1).map((row) => String(row[1] ?? "")));
  expect(formNames).toEqual(new Set(["Demographics", "Vital Signs", "Adverse Events"]));
  expect(formsRows.slice(1).filter((row) => String(row[2] ?? "").toLowerCase() === "yes").length).toBeGreaterThanOrEqual(1);

  const scheduleRows = worksheetRows(workbook.getWorksheet("_Schedule")!);
  const visits = (scheduleRows[0] ?? []).slice(1).map((value) => String(value ?? "").trim());
  expect(visits).toEqual(expect.arrayContaining(["Screening", "Baseline"]));

  const codelistRows = worksheetRows(workbook.getWorksheet("_Codelists")!).slice(1);
  const codelists = new Set(codelistRows.map((row) => String(row[0] ?? "").trim().toUpperCase()));
  expect(Array.from(codelists)).toEqual(expect.arrayContaining(["YESNO", "SEVERITY"]));

  const rowsByForm = ["DEMO", "VS", "AE"].flatMap((sheetName) => {
    const rows = worksheetRows(workbook.getWorksheet(sheetName)!);
    const headers = (rows[0] ?? []).map((header) =>
      String(header ?? "").trim().toLowerCase()
    );
    return rows.slice(1).map((row) => ({
      variableType: String(row[headers.indexOf("variable type")] ?? "").trim().toLowerCase(),
      required: String(row[headers.indexOf("required")] ?? "").trim().toLowerCase(),
      codelistId: String(row[headers.indexOf("codelist id")] ?? "").trim(),
      length: String(row[headers.indexOf("length")] ?? "").trim(),
      precision: String(row[headers.indexOf("precision")] ?? "").trim(),
      origin: String(row[headers.indexOf("origin")] ?? "").trim().toLowerCase(),
    }));
  });

  const variableTypes = new Set(rowsByForm.map((row) => row.variableType));
  expect(Array.from(variableTypes)).toEqual(
    expect.arrayContaining(["text", "integer", "float", "date"])
  );
  expect(rowsByForm.some((row) => row.codelistId.length > 0)).toBe(true);
  expect(rowsByForm.some((row) => row.length.length > 0 && row.precision.length > 0)).toBe(true);
  expect(rowsByForm.some((row) => row.origin === "derived")).toBe(true);
  expect(rowsByForm.some((row) => row.required === "yes")).toBe(true);
  expect(rowsByForm.some((row) => row.required === "no")).toBe(true);
}

async function parseReferenceWorkbook(filePath: string): Promise<StudyDesign> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  assertReferenceStudyRequirements(workbook);

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
  for (let i = 1; i < codelistRows.length; i += 1) {
    const [id, name, code, decode] = codelistRows[i] ?? [];
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
  for (let i = 1; i < formsRows.length; i += 1) {
    const [id, name, repeating] = formsRows[i] ?? [];
    if (!id) {
      continue;
    }

    const formOid = String(id).trim();
    formOids.push(formOid);
    study.forms[formOid] = {
      formOid,
      formName: String(name ?? formOid),
      orderNumber: i,
      repeating: String(repeating ?? "").trim().toLowerCase() === "yes",
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
    const formSheet = workbook.getWorksheet(formOid);
    if (!formSheet) {
      continue;
    }

    const rows = worksheetRows(formSheet);
    const headers = (rows[0] ?? []).map((header) =>
      String(header ?? "").trim().toLowerCase()
    );

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] ?? [];
      const variableName = row[headers.indexOf("variable name")];
      if (!variableName) {
        continue;
      }

      const itemOid = String(variableName).trim().toUpperCase();
      const label = row[headers.indexOf("label")];
      const variableType = row[headers.indexOf("variable type")];
      const required = row[headers.indexOf("required")];
      const showIf = row[headers.indexOf("show if")];
      const codelistId = row[headers.indexOf("codelist id")];

      study.forms[formOid].itemGroups[0].items.push({
        formOid,
        groupOid: `${formOid}_GRP`,
        itemOid,
        name: itemOid,
        orderNumber: i,
        effectiveVersion: study.metadata.version,
        label: { "en-US": String(label ?? itemOid) },
        dataType: mapDataType(variableType),
        validation: {
          required: String(required ?? "").trim().toLowerCase() === "yes",
        },
        ...(showIf ? { showIf: String(showIf) } : {}),
        ...(codelistId
          ? { codelistId: String(codelistId).trim().toUpperCase() }
          : {}),
      });
    }
  }

  const scheduleRows = worksheetRows(workbook.getWorksheet("_Schedule")!);
  const scheduleHeaders = (scheduleRows[0] ?? []).map((value) => String(value ?? ""));

  for (let col = 1; col < scheduleHeaders.length; col += 1) {
    const eventName = scheduleHeaders[col].trim();
    if (!eventName) {
      continue;
    }

    const forms = [];
    for (let row = 1; row < scheduleRows.length; row += 1) {
      const formOid = String(scheduleRows[row]?.[0] ?? "").trim();
      const marker = String(scheduleRows[row]?.[col] ?? "").trim().toUpperCase();
      if (marker === "X" || marker === "1") {
        forms.push({ formOid, orderNumber: forms.length + 1, mandatory: true });
      }
    }

    study.events.push({
      eventOid: `VISIT_${col}`,
      eventName,
      orderNumber: col,
      eventType: EventType.SCHEDULED,
      forms,
    });
  }

  return study;
}

function hasXmllint(): boolean {
  const check = spawnSync("xmllint", ["--version"], { stdio: "ignore" });
  return check.status === 0;
}

describe("ODM serialization proofing (reference study)", () => {
  it("generates deterministic schema-valid ODM XML from the canonical reference workbook", async () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    expect(fs.existsSync(schemaPath)).toBe(true);

    const study = await parseReferenceWorkbook(fixturePath);

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const xml = generateOdmXml(study);
    jest.useRealTimers();

    if (process.env.UPDATE_ODM_FIXTURE === "1") {
      fs.writeFileSync(expectedXmlPath, xml, "utf-8");
    }

    expect(fs.existsSync(expectedXmlPath)).toBe(true);
    expect(xml).toBe(fs.readFileSync(expectedXmlPath, "utf-8"));

    if (!hasXmllint()) {
      process.stderr.write(
        "Skipping ODM XSD validation: xmllint is not available in this environment.\n"
      );
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "crf-xl-odm-proof-"));
    const xmlFile = path.join(tempDir, "reference-study.odm.xml");
    fs.writeFileSync(xmlFile, xml, "utf-8");

    expect(() => {
      execFileSync("xmllint", ["--noout", "--schema", schemaPath, xmlFile], {
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});
