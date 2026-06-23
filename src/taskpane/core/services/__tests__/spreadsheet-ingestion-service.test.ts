/* eslint-disable no-undef */
/**
 * @issue #28
 */
/** @jest-environment node */
import {
  buildSheetScanResult,
  detectColumnMappings,
  validateMappings,
  buildIngestionPreview,
  ColumnCandidate,
  FieldMapping,
} from "../spreadsheet-ingestion-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeColumn(index: number, name: string, samples: string[] = []): ColumnCandidate {
  return { columnIndex: index, columnName: name, sampleValues: samples };
}

// ---------------------------------------------------------------------------
// buildSheetScanResult
// ---------------------------------------------------------------------------

describe("buildSheetScanResult", () => {
  it("returns empty result for empty input", () => {
    const result = buildSheetScanResult("Sheet1", []);
    expect(result.columnCandidates).toHaveLength(0);
    expect(result.rowCount).toBe(0);
    expect(result.detectedStructure).toBe("unknown");
  });

  it("parses header row and sample values correctly", () => {
    const rows = [
      ["Variable Name", "Label", "Variable Type"],
      ["USUBJID", "Subject ID", "Text"],
      ["AGE", "Age", "Integer"],
      ["", "", ""],
    ];
    const result = buildSheetScanResult("DM", rows);
    expect(result.sheetName).toBe("DM");
    expect(result.columnCandidates).toHaveLength(3);
    expect(result.columnCandidates[0].columnName).toBe("Variable Name");
    expect(result.columnCandidates[0].sampleValues).toEqual(["USUBJID", "AGE"]);
    expect(result.rowCount).toBe(3); // body rows (including blank)
  });

  it("skips empty header columns", () => {
    const rows = [
      ["Variable Name", "", "Variable Type"],
      ["VAR1", "val", "Text"],
    ];
    const result = buildSheetScanResult("Frm", rows);
    expect(result.columnCandidates).toHaveLength(2);
    expect(result.columnCandidates.map((c) => c.columnName)).toEqual([
      "Variable Name",
      "Variable Type",
    ]);
  });

  it("respects sampleSize limit", () => {
    const rows = [["Variable Name"], ...Array.from({ length: 20 }, (_, i) => [`VAR${i}`])];
    const result = buildSheetScanResult("Sheet", rows, 3);
    expect(result.columnCandidates[0].sampleValues).toHaveLength(3);
  });

  it("detects form_items structure", () => {
    const rows = [
      ["Variable Name", "Label", "Variable Type"],
      ["SEX", "Sex", "Codelist"],
    ];
    const result = buildSheetScanResult("DM", rows);
    expect(result.detectedStructure).toBe("form_items");
  });

  it("detects codelists structure", () => {
    const rows = [
      ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
      ["SEX", "Gender", "M", "Male"],
    ];
    const result = buildSheetScanResult("CL", rows);
    expect(result.detectedStructure).toBe("codelists");
  });

  it("detects forms_registry structure", () => {
    const rows = [
      ["Form OID", "Form Name", "Repeating"],
      ["DM", "Demographics", "No"],
    ];
    const result = buildSheetScanResult("Forms", rows);
    expect(result.detectedStructure).toBe("forms_registry");
  });
});

// ---------------------------------------------------------------------------
// detectColumnMappings
// ---------------------------------------------------------------------------

describe("detectColumnMappings", () => {
  it("assigns high confidence to exact canonical header matches", () => {
    const columns = [
      makeColumn(0, "Variable Name"),
      makeColumn(1, "Label"),
      makeColumn(2, "Variable Type"),
    ];
    const mappings = detectColumnMappings(columns, "form_item");

    const nameMapping = mappings.find((m) => m.targetField === "variable_name");
    expect(nameMapping?.sourceColumn?.columnIndex).toBe(0);
    expect(nameMapping?.confidence).toBe("high");

    const labelMapping = mappings.find((m) => m.targetField === "label");
    expect(labelMapping?.sourceColumn?.columnIndex).toBe(1);
    expect(labelMapping?.confidence).toBe("high");
  });

  it("assigns medium confidence to synonym header matches", () => {
    const columns = [makeColumn(0, "Question ID")];
    const mappings = detectColumnMappings(columns, "form_item");
    const nameMapping = mappings.find((m) => m.targetField === "variable_name");
    expect(nameMapping?.sourceColumn?.columnIndex).toBe(0);
    expect(nameMapping?.confidence).toBe("medium");
  });

  it("leaves unmatched fields as unresolved with null sourceColumn", () => {
    const columns = [makeColumn(0, "Variable Name")];
    const mappings = detectColumnMappings(columns, "form_item");
    const typeMapping = mappings.find((m) => m.targetField === "variable_type");
    expect(typeMapping?.sourceColumn).toBeNull();
    expect(typeMapping?.confidence).toBe("unresolved");
  });

  it("marks medium confidence when multiple columns match the same field", () => {
    const columns = [
      makeColumn(0, "Variable Name"),
      makeColumn(1, "Item OID"), // also maps to variable_name
    ];
    const mappings = detectColumnMappings(columns, "form_item");
    const nameMapping = mappings.find((m) => m.targetField === "variable_name");
    expect(nameMapping?.confidence).toBe("medium");
  });

  it("only returns fields for the requested target sheet", () => {
    const columns = [makeColumn(0, "Form OID"), makeColumn(1, "Variable Name")];
    const mappings = detectColumnMappings(columns, "forms_registry");
    const fields = mappings.map((m) => m.targetField);
    expect(fields).not.toContain("variable_name");
    expect(fields).toContain("form_oid");
  });

  it("detects codelist columns correctly", () => {
    const columns = [
      makeColumn(0, "Codelist ID"),
      makeColumn(1, "Codelist Name"),
      makeColumn(2, "Coded Value"),
      makeColumn(3, "Decode"),
    ];
    const mappings = detectColumnMappings(columns, "codelists");
    expect(mappings.find((m) => m.targetField === "cl_codelist_id")?.confidence).toBe("high");
    expect(mappings.find((m) => m.targetField === "cl_coded_value")?.confidence).toBe("high");
    expect(mappings.find((m) => m.targetField === "cl_decode")?.confidence).toBe("high");
  });

  it("matches common legacy aliases at medium confidence", () => {
    const columns = [makeColumn(0, "Response List")];
    const mappings = detectColumnMappings(columns, "form_item");
    const clMapping = mappings.find((m) => m.targetField === "codelist_id");
    expect(clMapping?.sourceColumn?.columnIndex).toBe(0);
    expect(clMapping?.confidence).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// validateMappings
// ---------------------------------------------------------------------------

describe("validateMappings", () => {
  it("emits missing-required errors for unmapped required fields", () => {
    const mappings: FieldMapping[] = [
      {
        targetField: "variable_name",
        sourceColumn: null,
        confidence: "unresolved",
        isUserOverridden: false,
      },
      {
        targetField: "label",
        sourceColumn: makeColumn(0, "Label"),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "variable_type",
        sourceColumn: makeColumn(1, "Variable Type"),
        confidence: "high",
        isUserOverridden: false,
      },
    ];
    const diags = validateMappings(mappings, "form_item");
    const missingReq = diags.filter((d) => d.category === "missing-required");
    expect(missingReq).toHaveLength(1);
    expect(missingReq[0].field).toBe("variable_name");
    expect(missingReq[0].severity).toBe("error");
  });

  it("emits ambiguous warning when same source column is reused", () => {
    const col = makeColumn(0, "Multi");
    const mappings: FieldMapping[] = [
      {
        targetField: "variable_name",
        sourceColumn: col,
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "label",
        sourceColumn: col,
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "variable_type",
        sourceColumn: makeColumn(1, "Type"),
        confidence: "high",
        isUserOverridden: false,
      },
    ];
    const diags = validateMappings(mappings, "form_item");
    const ambiguous = diags.filter((d) => d.category === "ambiguous");
    expect(ambiguous).toHaveLength(1);
    expect(ambiguous[0].severity).toBe("warning");
  });

  it("emits conflicting-types warning for unrecognised variable type samples", () => {
    const mappings: FieldMapping[] = [
      {
        targetField: "variable_name",
        sourceColumn: makeColumn(0, "Variable Name", ["VAR1"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "label",
        sourceColumn: makeColumn(1, "Label", ["Var 1"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "variable_type",
        sourceColumn: makeColumn(2, "Variable Type", ["FuzzyString", "WeirdDate"]),
        confidence: "high",
        isUserOverridden: false,
      },
    ];
    const diags = validateMappings(mappings, "form_item");
    const conflict = diags.filter((d) => d.category === "conflicting-types");
    expect(conflict).toHaveLength(1);
    expect(conflict[0].field).toBe("variable_type");
  });

  it("emits duplicate-identity warning when variable names repeat in sample", () => {
    const mappings: FieldMapping[] = [
      {
        targetField: "variable_name",
        sourceColumn: makeColumn(0, "Variable Name", ["SEX", "AGE", "SEX"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "label",
        sourceColumn: makeColumn(1, "Label", ["Sex", "Age", "Sex 2"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "variable_type",
        sourceColumn: makeColumn(2, "Variable Type", ["Codelist", "Integer", "Codelist"]),
        confidence: "high",
        isUserOverridden: false,
      },
    ];
    const diags = validateMappings(mappings, "form_item");
    const dupes = diags.filter((d) => d.category === "duplicate-identity");
    expect(dupes).toHaveLength(1);
    expect(dupes[0].field).toBe("variable_name");
  });

  it("returns no diagnostics for a clean fully-mapped set", () => {
    const mappings: FieldMapping[] = [
      {
        targetField: "variable_name",
        sourceColumn: makeColumn(0, "Variable Name", ["SEX"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "label",
        sourceColumn: makeColumn(1, "Label", ["Sex"]),
        confidence: "high",
        isUserOverridden: false,
      },
      {
        targetField: "variable_type",
        sourceColumn: makeColumn(2, "Variable Type", ["codelist"]),
        confidence: "high",
        isUserOverridden: false,
      },
    ];
    const diags = validateMappings(mappings, "form_item");
    const errors = diags.filter((d) => d.severity === "error");
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildIngestionPreview
// ---------------------------------------------------------------------------

describe("buildIngestionPreview", () => {
  it("sets canCommit=false when required mappings are missing", () => {
    const scanResult = buildSheetScanResult("DM", [["Label"], ["Sex"]]);
    // Only label mapped, variable_name and variable_type missing
    const mappings = detectColumnMappings(scanResult.columnCandidates, "form_item");
    const preview = buildIngestionPreview(scanResult, mappings);
    expect(preview.canCommit).toBe(false);
    expect(preview.diagnostics.some((d) => d.severity === "error")).toBe(true);
  });

  it("sets canCommit=true and produces formItemRows for a clean form-items sheet", () => {
    const rows = [
      ["Variable Name", "Label", "Variable Type"],
      ["USUBJID", "Subject ID", "Text"],
      ["AGE", "Age", "Integer"],
    ];
    const scanResult = buildSheetScanResult("DM", rows);
    expect(scanResult.detectedStructure).toBe("form_items");
    const mappings = detectColumnMappings(scanResult.columnCandidates, "form_item");
    const preview = buildIngestionPreview(scanResult, mappings);
    expect(preview.canCommit).toBe(true);
    // header + 2 data rows in sample
    expect(preview.projectedRows.formItemRows.length).toBeGreaterThanOrEqual(2);
    expect(preview.projectedRows.formItemRows[0]).toContain("Variable Name");
  });

  it("produces formsRows for a forms_registry sheet", () => {
    const rows = [
      ["Form OID", "Form Name", "Repeating", "Page Layout"],
      ["DM", "Demographics", "No", "Portrait"],
    ];
    const scanResult = buildSheetScanResult("Forms", rows);
    expect(scanResult.detectedStructure).toBe("forms_registry");
    const mappings = detectColumnMappings(scanResult.columnCandidates, "forms_registry");
    const preview = buildIngestionPreview(scanResult, mappings);
    expect(preview.canCommit).toBe(true);
    expect(preview.projectedRows.formsRows[0]).toEqual([
      "Form OID",
      "Form Name",
      "Repeating",
      "Page Layout",
    ]);
  });

  it("produces codelistRows for a codelists sheet", () => {
    const rows = [
      ["Codelist ID", "Codelist Name", "Coded Value", "Decode"],
      ["SEX", "Gender", "M", "Male"],
      ["SEX", "Gender", "F", "Female"],
    ];
    const scanResult = buildSheetScanResult("CL", rows);
    expect(scanResult.detectedStructure).toBe("codelists");
    const mappings = detectColumnMappings(scanResult.columnCandidates, "codelists");
    const preview = buildIngestionPreview(scanResult, mappings);
    expect(preview.canCommit).toBe(true);
    expect(preview.projectedRows.codelistRows[1]).toEqual(["SEX", "Gender", "M", "Male"]);
  });

  it("exposes all diagnostic categories through the preview", () => {
    // Duplicate variable names + missing required
    const rows = [
      ["Variable Name", "Label"],
      ["SEX", "Sex"],
      ["SEX", "Sex 2"],
    ];
    const scanResult = buildSheetScanResult("DM", rows);
    const mappings = detectColumnMappings(scanResult.columnCandidates, "form_item");
    const preview = buildIngestionPreview(scanResult, mappings);
    const categories = new Set(preview.diagnostics.map((d) => d.category));
    expect(categories.has("missing-required")).toBe(true);
    expect(categories.has("duplicate-identity")).toBe(true);
  });
});
