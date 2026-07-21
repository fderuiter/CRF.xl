/**
 * @issue #76, #63, #64, #93, #91
 */
/**
 * ============================================================================
 * migration-pipeline.ts
 * ============================================================================
 * Shared pipeline contract for all CRF.xl ingestion and migration flows.
 *
 * Every import tool (ODM reverse parser, Spreadsheet Ingestion Wizard,
 * CDISC API mapper) must consume these shared types to ensure a coherent
 * scan → map → preview → commit → summarize UX family.
 *
 * Shared model elements:
 *  - ImportDiagnostic   – unified diagnostic record
 *  - ImportSeverity     – normalised severity levels (lowercase)
 *  - ImportStatus       – pipeline gate status
 *  - WorkbookProjection – dry-run row projection across target sheets
 *  - ImportSummary      – gate model summarising a pending import
 *  - ImportProvenance   – GxP provenance record for every write-back
 *  - ImportManifest     – final manifest combining provenance + summary
 *
 * Owning issue: fderuiter/CRF.xl#76 (Ingestion & Migration Wizards epic)
 */

// ---------------------------------------------------------------------------
// Diagnostic model
// ---------------------------------------------------------------------------

import { Diagnostic, DiagnosticSeverity } from "./diagnostic-framework";

/** Normalised severity used across all import flows. */
export type ImportSeverity = DiagnosticSeverity;

/**
 * Shared diagnostic record emitted by every ingestion/migration service.
 * Service-specific interfaces (OdmImportDiagnostic, IngestionDiagnostic)
 * extend this base and may add source-specific fields (e.g. `field`).
 *
 * The `category` field holds a source-specific string code so that existing
 * category checks (e.g. `d.category === "Parse"`) continue to work in all
 * import services without alteration.
 */
export type ImportDiagnostic = Diagnostic;

// ---------------------------------------------------------------------------
// Status / gate model
// ---------------------------------------------------------------------------

/**
 * Gate status shared by all import flows.
 * - clean:     no diagnostics; safe to commit.
 * - warnings:  non-blocking diagnostics present; user may still commit.
 * - conflicts: one or more blocking errors; commit is disabled.
 */
export type ImportStatus = "clean" | "warnings" | "conflicts";

// ---------------------------------------------------------------------------
// Workbook projection
// ---------------------------------------------------------------------------

/**
 * Dry-run row projection across all CRF.xl target sheets.
 * Optional sheet arrays are absent when the import source does not produce
 * rows for that sheet (e.g. ODM import does not produce formItemRows).
 *
 * All arrays, when present, include a header row as their first element.
 */
export interface WorkbookProjection {
  /** _Study sheet rows (header + data). Absent for spreadsheet imports. */
  studyRows?: string[][];
  /** _Forms sheet rows (header + data). */
  formsRows: string[][];
  /** _Codelists sheet rows (header + data). */
  codelistRows: string[][];
  /** Target form sheet rows (header + data). Absent for ODM imports. */
  formItemRows?: string[][];
}

// ---------------------------------------------------------------------------
// Import summary
// ---------------------------------------------------------------------------

/**
 * Gate model produced before any workbook write-back.
 * Used by all import UIs to drive the preview → confirm step.
 */
export interface ImportSummary {
  status: ImportStatus;
  /** All diagnostics for this import run (errors + warnings + info). */
  diagnostics: ImportDiagnostic[];
  /** True when there are no blocking errors and the user may commit. */
  canCommit: boolean;
}

// ---------------------------------------------------------------------------
// Provenance tracking
// ---------------------------------------------------------------------------

/** Source category identifier used in provenance records. */
export type ImportSourceType = "odm-xml" | "spreadsheet" | "cdisc-api";

/**
 * GxP provenance record attached to every write-back operation.
 * Stored in sessionStorage after each successful import so that auditors
 * can reconstruct what was imported, from where, and when.
 */
export interface ImportProvenance {
  /** URI, file name, or logical identifier of the import source. */
  sourceId: string;
  /** Category of the import source. */
  sourceType: ImportSourceType;
  /** Standard release label or source-file hash, when available. */
  sourceVersion?: string;
  /** ISO-8601 timestamp of the import operation. */
  importedAt: string;
  /** User identifier (initials or account name), if available. */
  importedBy?: string;
}

/**
 * Full import manifest combining provenance with the post-commit summary.
 * Persisted to sessionStorage (key: "crf-xl-import-manifest") after every
 * successful write-back so that regulatory auditors have full traceability.
 */
export interface ImportManifest {
  provenance: ImportProvenance;
  summary: ImportSummary;
  /** Names of the CRF.xl system sheets that were written during this import. */
  sheetsWritten: string[];
  /** Total number of data rows written across all sheets. */
  rowsWritten: number;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Create a provenance record stamped with the current ISO-8601 timestamp.
 *
 * @param sourceId      Origin identifier (e.g. filename or logical URI).
 * @param sourceType    Category of the import source.
 * @param sourceVersion Release label or file hash (optional).
 * @param importedBy    User identifier (optional).
 * @returns
 */
export function createImportProvenance(
  sourceId: string,
  sourceType: ImportSourceType,
  sourceVersion?: string,
  importedBy?: string
): ImportProvenance {
  return {
    sourceId,
    sourceType,
    sourceVersion,
    importedAt: new Date().toISOString(),
    importedBy,
  };
}

/**
 * Assemble a complete import manifest from its constituent parts.
 *
 * @param provenance    Provenance record for this import.
 * @param summary       Gate summary (status, diagnostics, canCommit).
 * @param sheetsWritten Names of sheets that were written.
 * @param rowsWritten   Total data rows written.
 * @returns
 */
export function createImportManifest(
  provenance: ImportProvenance,
  summary: ImportSummary,
  sheetsWritten: string[],
  rowsWritten: number
): ImportManifest {
  return { provenance, summary, sheetsWritten, rowsWritten };
}

/**
 * Persist an import manifest to sessionStorage.
 * Overwrites any previously stored manifest for the session.
 * @param manifest
 */
export function persistImportManifest(manifest: ImportManifest): void {
  try {
    sessionStorage.setItem("crf-xl-import-manifest", JSON.stringify(manifest));
  } catch {
    // sessionStorage may be unavailable in test environments; swallow silently.
  }
}

/**
 * Load the most recent import manifest from sessionStorage.
 * Returns null if no manifest is stored or the stored value is malformed.
 * @returns
 */
export function loadImportManifest(): ImportManifest | null {
  try {
    const raw = sessionStorage.getItem("crf-xl-import-manifest");
    if (!raw) return null;
    return JSON.parse(raw) as ImportManifest;
  } catch {
    return null;
  }
}
