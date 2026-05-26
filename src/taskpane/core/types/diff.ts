/**
 * ============================================================================
 * diff.ts
 * ============================================================================
 * Payload contracts for the metadata diff engine. Describes the shape of
 * deterministic comparison reports produced by `diffStudyDesigns()`.
 */

import { CrfForm, CrfItem } from "./hierarchy";
import { Codelist } from "./clinical";
import { RuleDefinition } from "./rules-ast";

/**
 * The four possible diff operations for any comparable entity.
 */
export type DiffOperation = "added" | "removed" | "modified" | "unchanged";

/**
 * A diff entry for a top-level CRF form.
 */
export interface FormDiffEntry {
  operation: DiffOperation;
  formOid: string;
  baseline?: CrfForm;
  current?: CrfForm;
  /** Scalar field names that changed when operation is "modified". */
  changedFields?: string[];
}

/**
 * A diff entry for an individual CRF item (variable) within a form.
 */
export interface ItemDiffEntry {
  operation: DiffOperation;
  formOid: string;
  itemOid: string;
  baseline?: CrfItem;
  current?: CrfItem;
  /** Scalar field names that changed when operation is "modified". */
  changedFields?: string[];
}

/**
 * A diff entry for a codelist (controlled terminology dictionary).
 */
export interface CodelistDiffEntry {
  operation: DiffOperation;
  codelistId: string;
  baseline?: Codelist;
  current?: Codelist;
  /** Scalar field names that changed when operation is "modified". */
  changedFields?: string[];
}

/**
 * A diff entry for a rule definition.
 */
export interface RuleDiffEntry {
  operation: DiffOperation;
  ruleId: string;
  baseline?: RuleDefinition;
  current?: RuleDefinition;
  /** Scalar field names that changed when operation is "modified". */
  changedFields?: string[];
}

/**
 * Diff result for top-level study metadata fields.
 */
export interface StudyMetadataDiff {
  operation: "modified" | "unchanged";
  /** Scalar field names that changed when operation is "modified". */
  changedFields?: string[];
}

/**
 * The complete, deterministic diff report produced by `diffStudyDesigns()`.
 * All arrays are sorted by their natural key so the report is stable across runs.
 */
export interface StudyDiffReport {
  /** Protocol ID of the baseline study. */
  baselineProtocolId: string;
  /** Protocol ID of the current study. */
  currentProtocolId: string;
  /** ISO-8601 timestamp of when the report was generated. */
  generatedAt: string;
  /** Diff entries for all forms present in either study. */
  forms: FormDiffEntry[];
  /** Diff entries for all items present in either study. */
  items: ItemDiffEntry[];
  /** Diff entries for all codelists present in either study. */
  codelists: CodelistDiffEntry[];
  /** Diff entries for all rules present in either study. */
  rules: RuleDiffEntry[];
  /** Diff result for top-level study metadata. */
  metadataDiff: StudyMetadataDiff;
}
