/**
 * @issue #64, #76
 */
/**
 * ============================================================================
 * spreadsheet-ingestion-service.ts
 * ============================================================================
 * Pure-logic service for the Spreadsheet Ingestion Wizard.
 *
 * Responsibilities:
 *  - Define the catalog of CRF.xl target fields.
 *  - Auto-detect column→field mappings from legacy sheet headers and sample
 *    data, emitting a confidence score (high / medium / unresolved) for each.
 *  - Validate a completed mapping set and emit structured diagnostics.
 *  - Build a dry-run projection of what the import would write to each
 *    CRF.xl system sheet.
 *
 * No Excel.run / Office.js calls live here so the module is fully unit-testable.
 */

import {
  ImportDiagnostic,
  ImportProvenance,
  WorkbookProjection,
} from "./migration-pipeline";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Confidence level assigned to an auto-detected column mapping. */
export type ConfidenceLevel = "high" | "medium" | "unresolved";

/**
 * Identifies a CRF.xl canonical field that a source column can be mapped to.
 * Fields are grouped by the target sheet they populate.
 */
export type TargetField =
  // --- Form item sheet fields ---
  | "variable_name"
  | "label"
  | "variable_type"
  | "required"
  | "length"
  | "significant_digits"
  | "minimum"
  | "maximum"
  | "show_if"
  | "codelist_id"
  | "origin"
  | "method_oid"
  | "sdtm_domain"
  | "sdtm_variable"
  | "comment"
  // --- _Forms registry fields ---
  | "form_oid"
  | "form_name"
  | "repeating"
  | "page_layout"
  // --- _Codelists fields ---
  | "cl_codelist_id"
  | "cl_codelist_name"
  | "cl_coded_value"
  | "cl_decode";

/** Which CRF.xl system sheet a target field belongs to. */
export type TargetSheet = "form_item" | "forms_registry" | "codelists";

/** Metadata descriptor for a target field. */
export interface TargetFieldDescriptor {
  field: TargetField;
  label: string;
  required: boolean;
  sheet: TargetSheet;
  description: string;
}

/** A single column discovered in a legacy spreadsheet. */
export interface ColumnCandidate {
  /** Zero-based column index in the source sheet. */
  columnIndex: number;
  /** Header name as found in the source sheet. */
  columnName: string;
  /** Up to 5 non-empty sample values from the column body. */
  sampleValues: string[];
}

/** A single field→column mapping entry. */
export interface FieldMapping {
  targetField: TargetField;
  /** null means the user (or auto-detection) left this field unmapped. */
  sourceColumn: ColumnCandidate | null;
  confidence: ConfidenceLevel;
  isUserOverridden: boolean;
}

/** Diagnostic categories aligned with the issue acceptance criteria. */
export type DiagnosticCategory =
  | "missing-required"
  | "ambiguous"
  | "unsupported"
  | "conflicting-types"
  | "duplicate-identity"
  | "legacy-upgrade";

/** A single validation finding emitted by validateMappings(). */
export interface IngestionDiagnostic extends ImportDiagnostic {
  severity: "error" | "warning" | "info";
  category: DiagnosticCategory;
  message: string;
  /** The target field the diagnostic relates to, if applicable. */
  field?: TargetField;
}

import { StudyDesign } from "../types/hierarchy";
import { normalizeDataOrigin, parseReferencedVariables } from "../parser/metadata-utils";

/**
 * Normalizes an older or incomplete StudyDesign object to the current schema.
 * Returns the upgraded study and a list of diagnostics that detail what was changed.
 */
export function upgradeLegacyStudyDesign(study: any): { upgradedStudy: StudyDesign, diagnostics: IngestionDiagnostic[] } {
  const diagnostics: IngestionDiagnostic[] = [];

  if (!study) {
    return { upgradedStudy: study, diagnostics };
  }

  // Ensure submissionMetadata and its sub-arrays are fully initialized
  if (!study.submissionMetadata) {
    diagnostics.push({
      severity: "info",
      category: "legacy-upgrade",
      message: "Initialized missing Submission Metadata section.",
    });
    study.submissionMetadata = {
      sdtmDatasets: [],
      adamDatasets: [],
      sdtmDerivations: [],
      adamDerivations: [],
      sdtmVariableMetadata: [],
      adamVariableMetadata: [],
      comments: [],
      standards: [],
    };
  } else {
    study.submissionMetadata.sdtmDatasets = study.submissionMetadata.sdtmDatasets || [];
    study.submissionMetadata.adamDatasets = study.submissionMetadata.adamDatasets || [];
    study.submissionMetadata.sdtmDerivations = study.submissionMetadata.sdtmDerivations || [];
    study.submissionMetadata.adamDerivations = study.submissionMetadata.adamDerivations || [];
    study.submissionMetadata.sdtmVariableMetadata =
      study.submissionMetadata.sdtmVariableMetadata || [];
    study.submissionMetadata.adamVariableMetadata =
      study.submissionMetadata.adamVariableMetadata || [];
    study.submissionMetadata.comments = study.submissionMetadata.comments || [];
    study.submissionMetadata.standards = study.submissionMetadata.standards || [];
  }

  // Ensure sdtmMapping and adamMapping exist on all items
  if (study.forms) {
    Object.values(study.forms).forEach((form: any) => {
      if (form && form.itemGroups) {
        form.itemGroups.forEach((group: any) => {
          if (group && group.items) {
            group.items.forEach((item: any) => {
              if (item.nodeType === "display") {
                return;
              }
              if (!item.nodeType) {
                item.nodeType = "item";
              }
              if (!item.sdtmMapping) {
                item.sdtmMapping = {};
              }
              if (!item.adamMapping) {
                item.adamMapping = {};
              }
              const oldOrigin = item.origin;
              item.origin = normalizeDataOrigin(item.origin);
              if (oldOrigin && oldOrigin !== item.origin) {
                diagnostics.push({
                  severity: "info",
                  category: "legacy-upgrade",
                  message: `Normalized legacy data origin '${oldOrigin}' to '${item.origin}' for item ${item.itemOid}.`,
                  field: "origin",
                });
              }
            });
          }
        });
      }
    });
  }

  if (study.methods) {
    Object.values(study.methods).forEach((method: any) => {
      if (typeof method.referencedVariables === "string") {
        method.referencedVariables = parseReferencedVariables(method.referencedVariables);
        diagnostics.push({
          severity: "info",
          category: "legacy-upgrade",
          message: `Parsed legacy referenced variables string into array for method ${method.methodOid}.`,
        });
      }
    });
  }

  return { upgradedStudy: study as StudyDesign, diagnostics };
}

/**
 * Result of scanning one sheet in the source workbook. */
export interface SheetScanResult {
  sheetName: string;
  columnCandidates: ColumnCandidate[];
  rowCount: number;
  /**
   * Heuristic guess for what kind of CRF data this sheet contains.
   * Determined by inspecting header names and sample values.
   */
  detectedStructure: "form_items" | "forms_registry" | "codelists" | "unknown";
}

/** Dry-run projection produced by buildIngestionPreview(). */
export interface IngestionPreview {
  mappings: FieldMapping[];
  diagnostics: IngestionDiagnostic[];
  /** Whether there are no blocking errors so the import can be committed. */
  canCommit: boolean;
  /**
   * Row arrays representing the data that would be written to each target
   * sheet (header row included).  Satisfies the shared WorkbookProjection
   * contract so that UIs can use a unified projection type across all import
   * flows.
   */
  projectedRows: WorkbookProjection & {
    formItemRows: string[][];
    formsRows: string[][];
    codelistRows: string[][];
  };
  /**
   * Provenance record for this import run.
   * Set after the user confirms and the write-back succeeds.
   */
  provenance?: ImportProvenance;
}

export function mapRow(
  sourceRow: string[],
  mappings: FieldMapping[],
  targetStructure: TargetSheet
): string[] {
  const getColIndex = (field: TargetField): number | null =>
    mappings.find((m) => m.targetField === field)?.sourceColumn?.columnIndex ?? null;

  const getValue = (field: TargetField): string => {
    const idx = getColIndex(field);
    if (idx === null || idx < 0 || idx >= sourceRow.length) return "";
    return String(sourceRow[idx] ?? "").trim();
  };

  if (targetStructure === "form_item") {
    return [
      getValue("variable_name"),
      getValue("label"),
      getValue("variable_type"),
      getValue("required"),
      getValue("length"),
      getValue("significant_digits"),
      getValue("minimum"),
      getValue("maximum"),
      getValue("show_if"),
      getValue("codelist_id"),
      getValue("origin"),
      getValue("method_oid"),
      getValue("sdtm_domain"),
      getValue("sdtm_variable"),
      getValue("comment"),
    ];
  }

  if (targetStructure === "forms_registry") {
    return [
      getValue("form_oid"),
      getValue("form_name"),
      getValue("repeating"),
      getValue("page_layout"),
    ];
  }

  if (targetStructure === "codelists") {
    return [
      getValue("cl_codelist_id"),
      getValue("cl_codelist_name"),
      getValue("cl_coded_value"),
      getValue("cl_decode"),
    ];
  }

  return [];
}


/** Full catalog of all mappable CRF.xl target fields. */
export const TARGET_FIELDS: TargetFieldDescriptor[] = [
  // Form-item sheet
  {
    field: "variable_name",
    label: "Variable Name",
    required: true,
    sheet: "form_item",
    description: "Unique item identifier (OID) within the form.",
  },
  {
    field: "label",
    label: "Label",
    required: true,
    sheet: "form_item",
    description: "Question text / display label shown to the data-entry user.",
  },
  {
    field: "variable_type",
    label: "Variable Type",
    required: true,
    sheet: "form_item",
    description: "Data type: Text, Integer, Float, Date, Codelist, etc.",
  },
  {
    field: "required",
    label: "Required",
    required: false,
    sheet: "form_item",
    description: "Whether data entry is mandatory (Yes / No).",
  },
  {
    field: "length",
    label: "Length",
    required: false,
    sheet: "form_item",
    description: "Maximum character or numeric length.",
  },
  {
    field: "significant_digits",
    label: "Significant Digits",
    required: false,
    sheet: "form_item",
    description: "Number of significant digits for Float items.",
  },
  {
    field: "minimum",
    label: "Minimum",
    required: false,
    sheet: "form_item",
    description: "Minimum allowed value for range check.",
  },
  {
    field: "maximum",
    label: "Maximum",
    required: false,
    sheet: "form_item",
    description: "Maximum allowed value for range check.",
  },
  {
    field: "show_if",
    label: "Show If",
    required: false,
    sheet: "form_item",
    description: "Conditional display expression.",
  },
  {
    field: "codelist_id",
    label: "Codelist ID",
    required: false,
    sheet: "form_item",
    description: "Reference to a _Codelists entry.",
  },
  {
    field: "origin",
    label: "Origin",
    required: false,
    sheet: "form_item",
    description: "Data origin: Collected, Derived, Assigned, etc.",
  },
  {
    field: "method_oid",
    label: "Method OID",
    required: false,
    sheet: "form_item",
    description: "Reference to a _Methods computation.",
  },
  {
    field: "sdtm_domain",
    label: "SDTM Domain",
    required: false,
    sheet: "form_item",
    description: "Target SDTM domain (e.g. DM, VS).",
  },
  {
    field: "sdtm_variable",
    label: "SDTM Variable",
    required: false,
    sheet: "form_item",
    description: "Target SDTM variable name.",
  },
  {
    field: "comment",
    label: "Comment",
    required: false,
    sheet: "form_item",
    description: "Free-text annotation.",
  },
  // _Forms registry
  {
    field: "form_oid",
    label: "Form OID",
    required: true,
    sheet: "forms_registry",
    description: "Unique form identifier.",
  },
  {
    field: "form_name",
    label: "Form Name",
    required: true,
    sheet: "forms_registry",
    description: "Human-readable form name.",
  },
  {
    field: "repeating",
    label: "Repeating",
    required: false,
    sheet: "forms_registry",
    description: "Whether the form is repeating (Yes / No).",
  },
  {
    field: "page_layout",
    label: "Page Layout",
    required: false,
    sheet: "forms_registry",
    description: "Page layout: Portrait or Landscape.",
  },
  // _Codelists
  {
    field: "cl_codelist_id",
    label: "Codelist ID",
    required: true,
    sheet: "codelists",
    description: "Identifier for the codelist.",
  },
  {
    field: "cl_codelist_name",
    label: "Codelist Name",
    required: true,
    sheet: "codelists",
    description: "Human-readable codelist name.",
  },
  {
    field: "cl_coded_value",
    label: "Coded Value",
    required: true,
    sheet: "codelists",
    description: "Submission value for a codelist term.",
  },
  {
    field: "cl_decode",
    label: "Decode",
    required: false,
    sheet: "codelists",
    description: "Display text for a codelist term.",
  },
];

// ---------------------------------------------------------------------------
// Auto-detection helpers
// ---------------------------------------------------------------------------

/**
 * Maps normalised header aliases to target fields and an initial confidence.
 * Exact canonical matches score "high"; common synonyms score "medium".
 */
const HEADER_ALIAS_MAP: Array<{
  aliases: RegExp[];
  field: TargetField;
  confidence: ConfidenceLevel;
}> = [
  // ---- variable_name ----
  {
    aliases: [/^variable\s*name$/i, /^item\s*oid$/i, /^field\s*name$/i, /^var$/i],
    field: "variable_name",
    confidence: "high",
  },
  {
    aliases: [/^question\s*id$/i, /^item\s*id$/i, /^name$/i, /^id$/i],
    field: "variable_name",
    confidence: "medium",
  },
  // ---- label ----
  {
    aliases: [/^label$/i, /^question\s*[\\/]?\s*text$/i, /^prompt$/i],
    field: "label",
    confidence: "high",
  },
  {
    aliases: [/^description$/i, /^display\s*text$/i, /^text$/i, /^question$/i],
    field: "label",
    confidence: "medium",
  },
  // ---- variable_type ----
  {
    aliases: [/^variable\s*type$/i, /^data\s*type$/i, /^type$/i],
    field: "variable_type",
    confidence: "high",
  },
  {
    aliases: [/^field\s*type$/i, /^item\s*type$/i, /^format$/i],
    field: "variable_type",
    confidence: "medium",
  },
  // ---- required ----
  {
    aliases: [/^required$/i, /^mandatory$/i, /^obligatory$/i],
    field: "required",
    confidence: "high",
  },
  // ---- length ----
  {
    aliases: [/^length$/i, /^max\s*length$/i, /^maxlength$/i],
    field: "length",
    confidence: "high",
  },
  // ---- significant_digits ----
  {
    aliases: [/^significant\s*digits$/i, /^precision$/i, /^decimals?$/i],
    field: "significant_digits",
    confidence: "high",
  },
  // ---- minimum ----
  {
    aliases: [/^min(?:imum)?$/i, /^range\s*low$/i, /^lower\s*limit$/i],
    field: "minimum",
    confidence: "high",
  },
  // ---- maximum ----
  {
    aliases: [/^max(?:imum)?$/i, /^range\s*high$/i, /^upper\s*limit$/i],
    field: "maximum",
    confidence: "high",
  },
  // ---- show_if ----
  {
    aliases: [/^show\s*if$/i, /^display\s*condition$/i, /^condition$/i, /^skip\s*pattern$/i],
    field: "show_if",
    confidence: "high",
  },
  // ---- codelist_id ----
  {
    aliases: [/^codelist\s*id$/i, /^codelist$/i, /^dict(?:ionary)?$/i],
    field: "codelist_id",
    confidence: "high",
  },
  {
    aliases: [/^response\s*list$/i, /^value\s*list$/i],
    field: "codelist_id",
    confidence: "medium",
  },
  // ---- origin ----
  {
    aliases: [/^origin$/i, /^data\s*origin$/i, /^source$/i],
    field: "origin",
    confidence: "high",
  },
  // ---- method_oid ----
  {
    aliases: [/^method\s*oid$/i, /^method$/i, /^derivation$/i],
    field: "method_oid",
    confidence: "high",
  },
  // ---- sdtm_domain ----
  {
    aliases: [/^sdtm\s*domain$/i, /^domain$/i],
    field: "sdtm_domain",
    confidence: "high",
  },
  // ---- sdtm_variable ----
  {
    aliases: [/^sdtm\s*variable$/i, /^sdtm\s*var$/i, /^submission\s*variable$/i],
    field: "sdtm_variable",
    confidence: "high",
  },
  // ---- comment ----
  {
    aliases: [/^comment(?:s)?$/i, /^note(?:s)?$/i, /^annotation(?:s)?$/i],
    field: "comment",
    confidence: "high",
  },
  // ---- form_oid ----
  {
    aliases: [/^form\s*oid$/i, /^form\s*id$/i],
    field: "form_oid",
    confidence: "high",
  },
  // ---- form_name ----
  {
    aliases: [/^form\s*name$/i, /^form(?:\s*title)?$/i],
    field: "form_name",
    confidence: "high",
  },
  // ---- repeating ----
  {
    aliases: [/^repeating$/i, /^repeat(?:able)?$/i, /^is\s*repeating$/i],
    field: "repeating",
    confidence: "high",
  },
  // ---- page_layout ----
  {
    aliases: [/^page\s*layout$/i, /^layout$/i, /^orientation$/i],
    field: "page_layout",
    confidence: "high",
  },
  // ---- cl_codelist_id ----
  {
    aliases: [/^cl(?:_|\s*)codelist(?:_|\s*)id$/i, /^codelist(?:\s*)identifier$/i, /^codelist\s*id$/i],
    field: "cl_codelist_id",
    confidence: "high",
  },
  // ---- cl_codelist_name ----
  {
    aliases: [/^codelist\s*name$/i, /^cl(?:_|\s*)name$/i],
    field: "cl_codelist_name",
    confidence: "high",
  },
  // ---- cl_coded_value ----
  {
    aliases: [/^coded\s*value$/i, /^code(?:\s*value)?$/i, /^value$/i, /^submission\s*value$/i],
    field: "cl_coded_value",
    confidence: "high",
  },
  // ---- cl_decode ----
  {
    aliases: [/^decode(?:d)?(?:\s*text)?$/i, /^display\s*value$/i, /^term$/i, /^meaning$/i],
    field: "cl_decode",
    confidence: "high",
  },
];

/**
 * Resolve a column header to ALL matching target fields.
 * A header can match fields on different target sheets (e.g. "Codelist ID"
 * maps to `codelist_id` on form-item sheets and to `cl_codelist_id` on
 * codelist sheets).  The caller is responsible for filtering to the
 * relevant target sheet.
 */
function resolveHeaderToFields(
  headerName: string
): Array<{ field: TargetField; confidence: ConfidenceLevel }> {
  const trimmed = headerName.trim();
  const results: Array<{ field: TargetField; confidence: ConfidenceLevel }> = [];
  for (const entry of HEADER_ALIAS_MAP) {
    for (const alias of entry.aliases) {
      if (alias.test(trimmed)) {
        results.push({ field: entry.field, confidence: entry.confidence });
        break; // only the first alias that matches within this entry
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Structure detection
// ---------------------------------------------------------------------------

/** Heuristically determine what kind of CRF data a sheet contains. */
function detectSheetStructure(
  columns: ColumnCandidate[]
): SheetScanResult["detectedStructure"] {
  const headers = columns.map((c) => c.columnName.toLowerCase().trim());

  const hasCodelistMarkers =
    (headers.some((h) => /coded\s*value|submission\s*value/.test(h)) &&
      headers.some((h) => /decode|display\s*value/.test(h))) ||
    (headers.some((h) => /codelist\s*(name|id)/.test(h)) &&
      headers.some((h) => /value/.test(h)));

  const hasFormRegistryMarkers =
    headers.some((h) => /^form\s*(oid|id|name)/.test(h)) &&
    !headers.some((h) => /variable\s*(name|type)|label/.test(h));

  const hasItemMarkers =
    headers.some((h) => /variable\s*(name|type)|label/.test(h)) ||
    headers.some((h) => /^(name|id|item)$/.test(h));

  if (hasCodelistMarkers) return "codelists";
  if (hasFormRegistryMarkers) return "forms_registry";
  if (hasItemMarkers) return "form_items";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given a list of columns from a legacy sheet, produce an initial set of
 * FieldMappings with auto-detected source columns and confidence scores.
 *
 * Only the target fields relevant to the requested `targetSheet` are returned.
 */
export function detectColumnMappings(
  columns: ColumnCandidate[],
  targetSheet: TargetSheet
): FieldMapping[] {
  // Only surface fields belonging to the requested target sheet.
  const relevantFields = TARGET_FIELDS.filter((f) => f.sheet === targetSheet);

  // Build a map of column index → all resolved { field, confidence } entries,
  // filtered to only the fields relevant for this target sheet.
  const columnResolutions = new Map<
    number,
    Array<{ field: TargetField; confidence: ConfidenceLevel }>
  >();
  for (const column of columns) {
    const allResolved = resolveHeaderToFields(column.columnName);
    const relevant = allResolved.filter((r) =>
      relevantFields.some((f) => f.field === r.field)
    );
    if (relevant.length > 0) {
      columnResolutions.set(column.columnIndex, relevant);
    }
  }

  // For each target field, find the best matching column (if any).
  return relevantFields.map((descriptor) => {
    // Find columns that have this field in their resolution list.
    const matchingColumns = columns.filter((col) => {
      const resolutions = columnResolutions.get(col.columnIndex);
      return resolutions?.some((r) => r.field === descriptor.field) ?? false;
    });

    if (matchingColumns.length === 0) {
      return {
        targetField: descriptor.field,
        sourceColumn: null,
        confidence: "unresolved",
        isUserOverridden: false,
      };
    }

    if (matchingColumns.length === 1) {
      const resolutions = columnResolutions.get(matchingColumns[0].columnIndex)!;
      const match = resolutions.find((r) => r.field === descriptor.field)!;
      return {
        targetField: descriptor.field,
        sourceColumn: matchingColumns[0],
        confidence: match.confidence,
        isUserOverridden: false,
      };
    }

    // Multiple columns match → mark as ambiguous (medium confidence, first pick).
    return {
      targetField: descriptor.field,
      sourceColumn: matchingColumns[0],
      confidence: "medium",
      isUserOverridden: false,
    };
  });
}

/**
 * Validate a set of field mappings and return structured diagnostics.
 * Covers all diagnostic categories required by the acceptance criteria.
 */
export function validateMappings(
  mappings: FieldMapping[],
  targetSheet: TargetSheet
): IngestionDiagnostic[] {
  const diagnostics: IngestionDiagnostic[] = [];
  const relevantFields = TARGET_FIELDS.filter((f) => f.sheet === targetSheet);

  // --- Missing required mappings ---
  for (const descriptor of relevantFields) {
    if (!descriptor.required) continue;
    const mapping = mappings.find((m) => m.targetField === descriptor.field);
    if (!mapping || !mapping.sourceColumn) {
      diagnostics.push({
        severity: "error",
        category: "missing-required",
        message: `Required field "${descriptor.label}" has no source column mapped.`,
        field: descriptor.field,
      });
    }
  }

  // --- Ambiguous: multiple mappings pointing to the same source column ---
  const sourceColumnUsage = new Map<number, TargetField[]>();
  for (const mapping of mappings) {
    if (!mapping.sourceColumn) continue;
    const idx = mapping.sourceColumn.columnIndex;
    const existing = sourceColumnUsage.get(idx) ?? [];
    existing.push(mapping.targetField);
    sourceColumnUsage.set(idx, existing);
  }
  sourceColumnUsage.forEach((fields, colIdx) => {
    if (fields.length > 1) {
      const fieldLabels = fields
        .map((f) => TARGET_FIELDS.find((d) => d.field === f)?.label ?? f)
        .join(", ");
      const col = mappings
        .find((m) => m.sourceColumn?.columnIndex === colIdx)
        ?.sourceColumn?.columnName;
      diagnostics.push({
        severity: "warning",
        category: "ambiguous",
        message: `Source column "${col ?? colIdx}" is mapped to multiple target fields: ${fieldLabels}.`,
      });
    }
  });

  // --- Conflicting variable types (heuristic from sample values) ---
  for (const mapping of mappings) {
    if (mapping.targetField !== "variable_type" || !mapping.sourceColumn) continue;
    const knownTypes = new Set([
      "text",
      "integer",
      "float",
      "date",
      "time",
      "datetime",
      "boolean",
      "codelist",
    ]);
    const unknownSamples = mapping.sourceColumn.sampleValues.filter(
      (v) => !knownTypes.has(v.toLowerCase().trim())
    );
    if (unknownSamples.length > 0) {
      diagnostics.push({
        severity: "warning",
        category: "conflicting-types",
        message: `Variable Type column contains unrecognised type values: ${unknownSamples.slice(0, 3).join(", ")}.`,
        field: "variable_type",
      });
    }
  }

  // --- Duplicate identity: same variable_name value appears more than once ---
  for (const mapping of mappings) {
    if (mapping.targetField !== "variable_name" || !mapping.sourceColumn) continue;
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const v of mapping.sourceColumn.sampleValues) {
      const key = v.trim().toUpperCase();
      if (key && seen.has(key)) {
        duplicates.push(v);
      }
      seen.add(key);
    }
    if (duplicates.length > 0) {
      diagnostics.push({
        severity: "warning",
        category: "duplicate-identity",
        message: `Variable Name column contains duplicate values in the sample: ${duplicates.slice(0, 3).join(", ")}.`,
        field: "variable_name",
      });
    }
  }

  return diagnostics;
}

/**
 * Build a dry-run preview of what the import would write to each CRF.xl
 * system sheet.  No Excel.run / side-effects – pure data projection.
 */
export function buildIngestionPreview(
  scanResult: SheetScanResult,
  mappings: FieldMapping[]
): IngestionPreview {
  const diagnostics = validateMappings(mappings, scanResult.detectedStructure === "codelists"
    ? "codelists"
    : scanResult.detectedStructure === "forms_registry"
    ? "forms_registry"
    : "form_item");
  const hasBlockingErrors = diagnostics.some((d) => d.severity === "error");

  const projectedRows: IngestionPreview["projectedRows"] = {
    formItemRows: [],
    formsRows: [],
    codelistRows: [],
  };

  if (!hasBlockingErrors) {
    const getMappedColumn = (field: TargetField): ColumnCandidate | null =>
      mappings.find((m) => m.targetField === field)?.sourceColumn ?? null;

    if (scanResult.detectedStructure === "form_items") {
      const headers = [
        "Variable Name",
        "Label",
        "Variable Type",
        "Required",
        "Length",
        "Significant Digits",
        "Minimum",
        "Maximum",
        "Show If",
        "Codelist ID",
        "Origin",
        "Method OID",
        "SDTM Domain",
        "SDTM Variable",
        "Comment",
      ];
      projectedRows.formItemRows = [headers];

      const rowCount = Math.max(
        ...mappings
          .map((m) => m.sourceColumn?.sampleValues.length ?? 0)
          .filter((n) => n > 0),
        0
      );

      for (let i = 0; i < rowCount; i++) {
        const row = [
          getMappedColumn("variable_name")?.sampleValues[i] ?? "",
          getMappedColumn("label")?.sampleValues[i] ?? "",
          getMappedColumn("variable_type")?.sampleValues[i] ?? "",
          getMappedColumn("required")?.sampleValues[i] ?? "",
          getMappedColumn("length")?.sampleValues[i] ?? "",
          getMappedColumn("significant_digits")?.sampleValues[i] ?? "",
          getMappedColumn("minimum")?.sampleValues[i] ?? "",
          getMappedColumn("maximum")?.sampleValues[i] ?? "",
          getMappedColumn("show_if")?.sampleValues[i] ?? "",
          getMappedColumn("codelist_id")?.sampleValues[i] ?? "",
          getMappedColumn("origin")?.sampleValues[i] ?? "",
          getMappedColumn("method_oid")?.sampleValues[i] ?? "",
          getMappedColumn("sdtm_domain")?.sampleValues[i] ?? "",
          getMappedColumn("sdtm_variable")?.sampleValues[i] ?? "",
          getMappedColumn("comment")?.sampleValues[i] ?? "",
        ];
        projectedRows.formItemRows.push(row);
      }
    }

    if (scanResult.detectedStructure === "forms_registry") {
      const headers = ["Form OID", "Form Name", "Repeating", "Page Layout"];
      projectedRows.formsRows = [headers];

      const rowCount = Math.max(
        ...mappings
          .map((m) => m.sourceColumn?.sampleValues.length ?? 0)
          .filter((n) => n > 0),
        0
      );

      for (let i = 0; i < rowCount; i++) {
        projectedRows.formsRows.push([
          getMappedColumn("form_oid")?.sampleValues[i] ?? "",
          getMappedColumn("form_name")?.sampleValues[i] ?? "",
          getMappedColumn("repeating")?.sampleValues[i] ?? "",
          getMappedColumn("page_layout")?.sampleValues[i] ?? "",
        ]);
      }
    }

    if (scanResult.detectedStructure === "codelists") {
      const headers = ["Codelist ID", "Codelist Name", "Coded Value", "Decode"];
      projectedRows.codelistRows = [headers];

      const rowCount = Math.max(
        ...mappings
          .map((m) => m.sourceColumn?.sampleValues.length ?? 0)
          .filter((n) => n > 0),
        0
      );

      for (let i = 0; i < rowCount; i++) {
        projectedRows.codelistRows.push([
          getMappedColumn("cl_codelist_id")?.sampleValues[i] ?? "",
          getMappedColumn("cl_codelist_name")?.sampleValues[i] ?? "",
          getMappedColumn("cl_coded_value")?.sampleValues[i] ?? "",
          getMappedColumn("cl_decode")?.sampleValues[i] ?? "",
        ]);
      }
    }
  }

  const affectedSheets: string[] = [];
  if (projectedRows.formItemRows.length > 0) affectedSheets.push("(target form sheet)");
  if (projectedRows.formsRows.length > 0) affectedSheets.push("_Forms");
  if (projectedRows.codelistRows.length > 0) affectedSheets.push("_Codelists");

  return {
    mappings,
    diagnostics,
    canCommit: !hasBlockingErrors,
    projectedRows,
  };
}

/**
 * Given raw sheet data (header row + body rows), build a SheetScanResult.
 * This is called by the wizard after reading the sheet via Excel.run.
 *
 * @param sheetName   Name of the source sheet.
 * @param rows        2-D array where rows[0] is the header row.
 * @param sampleSize  Maximum number of body-row values to capture per column.
 */
export function buildSheetScanResult(
  sheetName: string,
  rows: string[][],
  sampleSize = 5,
  totalRowCount?: number
): SheetScanResult {
  if (!rows || rows.length === 0) {
    return {
      sheetName,
      columnCandidates: [],
      rowCount: 0,
      detectedStructure: "unknown",
    };
  }

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  const columnCandidates: ColumnCandidate[] = headerRow
    .map((header, colIndex) => {
      if (!header || String(header).trim() === "") return null;
      const sampleValues = bodyRows
        .map((r) => String(r[colIndex] ?? "").trim())
        .filter((v) => v !== "")
        .slice(0, sampleSize);
      return {
        columnIndex: colIndex,
        columnName: String(header).trim(),
        sampleValues,
      } satisfies ColumnCandidate;
    })
    .filter((c): c is ColumnCandidate => c !== null);

  return {
    sheetName,
    columnCandidates,
    rowCount: totalRowCount !== undefined ? totalRowCount : bodyRows.length,
    detectedStructure: detectSheetStructure(columnCandidates),
  };
}
