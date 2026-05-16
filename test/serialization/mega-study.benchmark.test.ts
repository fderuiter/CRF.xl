/** @jest-environment node */
import os from "os";
import path from "path";
import { performance } from "perf_hooks";
import ExcelJS from "exceljs";
import { validateStudyDesign } from "../../src/taskpane/core/parser/validator";
import { DataType, EventType, StudyDesign } from "../../src/taskpane/core/types";
import { buildMatrixSearchEntries, filterMatrixEntries } from "../../src/taskpane/components/views/matrix-view-utils";

const fixturePath = path.resolve(
  __dirname,
  "../fixtures/mega-study/mega-study-v1.xlsx"
);

const FIXTURE_VERSION = "v1";

const EXPECTED_COUNTS = {
  forms: 50,
  variablesPerForm: 30,
  totalVariables: 1500,
  codelistEntries: 5000,
  scheduleRows: 200,
  totalWorkbookRows: 6805,
};

const PERFORMANCE_BUDGET_MS = {
  coldParse: 3000,
  warmParse: 1500,
  validation: 500,
  matrixSearch: 150,
  taskpaneBlocking: 1000,
};

const MAX_MEMORY_MB = 1024;

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

function parseWorkbookToStudy(workbook: ExcelJS.Workbook): {
  study: StudyDesign;
  counts: {
    forms: number;
    variables: number;
    codelistEntries: number;
    scheduleRows: number;
    totalWorkbookRows: number;
  };
} {
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

  let codelistEntries = 0;
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
    codelistEntries += 1;
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

  let variableCount = 0;
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

      variableCount += 1;
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

  let totalWorkbookRows = 0;
  workbook.eachSheet((sheet) => {
    totalWorkbookRows += sheet.rowCount;
  });

  return {
    study,
    counts: {
      forms: formOids.length,
      variables: variableCount,
      codelistEntries,
      scheduleRows: Math.max(scheduleRows.length - 1, 0),
      totalWorkbookRows,
    },
  };
}

describe("Mega-study benchmark harness", () => {
  it("parses the committed fixture and emits structured benchmark output", async () => {
    const coldStart = performance.now();
    const coldWorkbook = new ExcelJS.Workbook();
    await coldWorkbook.xlsx.readFile(fixturePath);
    const { study, counts } = parseWorkbookToStudy(coldWorkbook);
    const coldParseMs = performance.now() - coldStart;

    const validationStart = performance.now();
    const issues = validateStudyDesign(study);
    const validationMs = performance.now() - validationStart;

    const warmStart = performance.now();
    parseWorkbookToStudy(coldWorkbook);
    const warmParseMs = performance.now() - warmStart;

    const matrixEntries = buildMatrixSearchEntries(study);
    const searchStart = performance.now();
    const searchQuery = "VAR_025_015";
    const matches = filterMatrixEntries(matrixEntries, {
      search: searchQuery,
      required: "all",
      dataType: "all",
      visit: "all",
    });
    const matrixSearchMs = performance.now() - searchStart;

    const rssMb = process.memoryUsage().rss / (1024 * 1024);

    const result = {
      fixture: {
        name: "mega-study-v1.xlsx",
        version: FIXTURE_VERSION,
      },
      counts: {
        forms: counts.forms,
        variables: counts.variables,
        codelistEntries: counts.codelistEntries,
        scheduleRows: counts.scheduleRows,
        workbookRows: counts.totalWorkbookRows,
      },
      metricsMs: {
        coldParse: Number(coldParseMs.toFixed(2)),
        warmParse: Number(warmParseMs.toFixed(2)),
        validation: Number(validationMs.toFixed(2)),
        matrixSearch: Number(matrixSearchMs.toFixed(2)),
      },
      memory: {
        rssMb: Number(rssMb.toFixed(2)),
      },
      validation: {
        issueCount: issues.length,
      },
      environment: {
        platform: process.platform,
        osRelease: os.release(),
        nodeVersion: process.version,
        excelVersion: "N/A (node harness)",
      },
    };

    process.stdout.write(`[mega-study-benchmark] ${JSON.stringify(result)}\n`);

    expect(counts.forms).toBe(EXPECTED_COUNTS.forms);
    expect(counts.variables).toBe(EXPECTED_COUNTS.totalVariables);
    expect(counts.codelistEntries).toBe(EXPECTED_COUNTS.codelistEntries);
    expect(counts.scheduleRows).toBe(EXPECTED_COUNTS.scheduleRows);
    expect(counts.totalWorkbookRows).toBe(EXPECTED_COUNTS.totalWorkbookRows);
    expect(matrixEntries.length).toBeGreaterThan(0);
    expect(matches.length).toBeGreaterThan(0);

    expect(result.metricsMs.coldParse).toBeGreaterThan(0);
    expect(result.metricsMs.warmParse).toBeGreaterThan(0);
    expect(result.metricsMs.validation).toBeGreaterThan(0);
    expect(result.metricsMs.matrixSearch).toBeGreaterThanOrEqual(0);

    if (process.env.ENFORCE_PERFORMANCE_BUDGET === "1") {
      expect(result.metricsMs.coldParse).toBeLessThanOrEqual(PERFORMANCE_BUDGET_MS.coldParse);
      expect(result.metricsMs.warmParse).toBeLessThanOrEqual(PERFORMANCE_BUDGET_MS.warmParse);
      expect(result.metricsMs.validation).toBeLessThanOrEqual(PERFORMANCE_BUDGET_MS.validation);
      expect(result.metricsMs.matrixSearch).toBeLessThanOrEqual(PERFORMANCE_BUDGET_MS.matrixSearch);
      expect(result.metricsMs.coldParse).toBeLessThanOrEqual(PERFORMANCE_BUDGET_MS.taskpaneBlocking);
      expect(result.memory.rssMb).toBeLessThanOrEqual(MAX_MEMORY_MB);
    }
  });
});
