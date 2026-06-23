/**
 * @issue #28
 */
/** @jest-environment node */
import {
  createImportProvenance,
  createImportManifest,
  ImportDiagnostic,
  ImportManifest,
  ImportProvenance,
  ImportSummary,
  WorkbookProjection,
} from "../migration-pipeline";

// ---------------------------------------------------------------------------
// createImportProvenance
// ---------------------------------------------------------------------------

describe("createImportProvenance", () => {
  it("creates a provenance record with correct sourceId and sourceType", () => {
    const prov = createImportProvenance("my-study.xml", "odm-xml");
    expect(prov.sourceId).toBe("my-study.xml");
    expect(prov.sourceType).toBe("odm-xml");
  });

  it("stamps importedAt as a valid ISO-8601 timestamp", () => {
    const before = new Date().toISOString();
    const prov = createImportProvenance("src", "spreadsheet");
    const after = new Date().toISOString();
    expect(prov.importedAt >= before).toBe(true);
    expect(prov.importedAt <= after).toBe(true);
    expect(() => new Date(prov.importedAt)).not.toThrow();
  });

  it("propagates optional sourceVersion and importedBy", () => {
    const prov = createImportProvenance("pkg-1.0", "cdisc-api", "2.0", "JDoe");
    expect(prov.sourceVersion).toBe("2.0");
    expect(prov.importedBy).toBe("JDoe");
  });

  it("leaves optional fields undefined when not provided", () => {
    const prov = createImportProvenance("file.xml", "odm-xml");
    expect(prov.sourceVersion).toBeUndefined();
    expect(prov.importedBy).toBeUndefined();
  });

  it("creates unique timestamps for successive calls", async () => {
    const prov1 = createImportProvenance("a", "odm-xml");
    await new Promise((r) => setTimeout(r, 5));
    const prov2 = createImportProvenance("b", "odm-xml");
    expect(prov2.importedAt >= prov1.importedAt).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createImportManifest
// ---------------------------------------------------------------------------

describe("createImportManifest", () => {
  const provenance: ImportProvenance = createImportProvenance("test-study.xml", "odm-xml", "1.0");

  const cleanDiagnostic: ImportDiagnostic = {
    severity: "info",
    category: "info",
    message: "Import completed.",
  };

  const summary: ImportSummary = {
    status: "clean",
    diagnostics: [cleanDiagnostic],
    canCommit: true,
  };

  it("assembles manifest from constituent parts", () => {
    const manifest = createImportManifest(provenance, summary, ["_Study", "_Forms"], 3);
    expect(manifest.provenance).toBe(provenance);
    expect(manifest.summary).toBe(summary);
    expect(manifest.sheetsWritten).toEqual(["_Study", "_Forms"]);
    expect(manifest.rowsWritten).toBe(3);
  });

  it("reflects the correct import status in the manifest", () => {
    const warningSummary: ImportSummary = {
      status: "warnings",
      diagnostics: [],
      canCommit: true,
    };
    const manifest = createImportManifest(provenance, warningSummary, ["_Codelists"], 10);
    expect(manifest.summary.status).toBe("warnings");
    expect(manifest.summary.canCommit).toBe(true);
  });

  it("manifest with conflicts reports canCommit: false", () => {
    const conflictSummary: ImportSummary = {
      status: "conflicts",
      diagnostics: [
        {
          severity: "error",
          category: "Parse",
          message: "Malformed XML",
        },
      ],
      canCommit: false,
    };
    const manifest = createImportManifest(provenance, conflictSummary, [], 0);
    expect(manifest.summary.canCommit).toBe(false);
    expect(manifest.summary.status).toBe("conflicts");
  });
});

// ---------------------------------------------------------------------------
// ImportDiagnostic structural type tests
// ---------------------------------------------------------------------------

describe("ImportDiagnostic type contract", () => {
  it("accepts a minimal diagnostic with severity, category, and message", () => {
    const diag: ImportDiagnostic = {
      severity: "error",
      category: "missing-required",
      message: "Variable Name is required.",
    };
    expect(diag.severity).toBe("error");
    expect(diag.category).toBe("missing-required");
    expect(diag.location).toBeUndefined();
  });

  it("accepts a diagnostic with an optional location field", () => {
    const diag: ImportDiagnostic = {
      severity: "warning",
      category: "Unsupported",
      message: "ItemDef not projected.",
      location: "_ODM",
    };
    expect(diag.location).toBe("_ODM");
  });

  it("accepts all three severity levels", () => {
    const severities: Array<ImportDiagnostic["severity"]> = ["error", "warning", "info"];
    severities.forEach((sev) => {
      const diag: ImportDiagnostic = { severity: sev, category: "test", message: "msg" };
      expect(diag.severity).toBe(sev);
    });
  });
});

// ---------------------------------------------------------------------------
// WorkbookProjection structural type tests
// ---------------------------------------------------------------------------

describe("WorkbookProjection type contract", () => {
  it("allows a minimal projection with only formsRows and codelistRows", () => {
    const proj: WorkbookProjection = {
      formsRows: [
        ["Form OID", "Form Name"],
        ["DM", "Demographics"],
      ],
      codelistRows: [
        ["Codelist ID", "Name"],
        ["SEX", "Gender"],
      ],
    };
    expect(proj.studyRows).toBeUndefined();
    expect(proj.formItemRows).toBeUndefined();
    expect(proj.formsRows).toHaveLength(2);
  });

  it("allows a full projection with all optional fields", () => {
    const proj: WorkbookProjection = {
      studyRows: [["Protocol ID"], ["P001"]],
      formsRows: [["Form OID"], ["DM"]],
      codelistRows: [["Codelist ID"], ["SEX"]],
      formItemRows: [["Variable Name"], ["AGE"]],
    };
    expect(proj.studyRows).toHaveLength(2);
    expect(proj.formItemRows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// persistImportManifest / loadImportManifest (sessionStorage integration)
// ---------------------------------------------------------------------------

describe("persistImportManifest / loadImportManifest", () => {
  // Node environment doesn't have sessionStorage — verify graceful no-op
  it("gracefully handles missing sessionStorage", () => {
    const { persistImportManifest, loadImportManifest } = require("../migration-pipeline");

    const prov = createImportProvenance("test.xml", "odm-xml");
    const summary: ImportSummary = { status: "clean", diagnostics: [], canCommit: true };
    const manifest = createImportManifest(prov, summary, [], 0);

    // In node (no sessionStorage), persistImportManifest must not throw
    expect(() => persistImportManifest(manifest)).not.toThrow();
    // loadImportManifest must return null (sessionStorage absent)
    expect(loadImportManifest()).toBeNull();
  });
});
