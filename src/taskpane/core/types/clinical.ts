/**
 * ============================================================================
 * clinical.ts
 * ============================================================================
 * CDISC mappings, dictionary typings, and external integration points.
 */

import { TranslatedText } from "./common";
import { AdamCore, AdamDatasetClass, CodingTermType, DatasetPurpose, DataType, LabType, SdtmCore, SdtmDatasetClass, VariableOrigin } from "./enums";

export interface SensorConfig {
  deviceType: string;
  metricId: string;
  frequency?: string;
}

export interface LabConfig {
  labType: LabType;
  labTestCode: string;
  nciLabCode?: string;
}

export interface MedicalCodingLink {
  termType: CodingTermType;
  linkedItemOid: string;
  dictionaryLevel?: string;
}

export interface SdtmMapping {
  domain: string;
  variable: string;
  nciVariableCode?: string;
  sasFieldName?: string;
  sasLabel?: string;
  sasDatasetName?: string;
  core?: SdtmCore;
  role?: string;
  /** Define-XML 2.1 origin element for this variable in the submission dataset. */
  origin?: VariableOrigin;
  /** CRF page reference(s), e.g. "1-3" or "E2". */
  pages?: string;
  /** OID reference to a SubmissionComment entry in SubmissionMetadata.comments. */
  commentOid?: string;
  /** Whether this variable is mandatory in the target SDTM domain. */
  mandatory?: boolean;
  /**
   * True when this mapping entry represents a Value Level Metadata (VLM) row
   * rather than a standard variable-level mapping. VLM rows are aggregated
   * under SubmissionMetadata.sdtmVariableMetadata.
   */
  isVlm?: boolean;
}

export interface CodelistItem {
  codelistId: string;
  codedValue: string;
  decodedText: TranslatedText;
  orderNumber: number;
  nciCode?: string;
  specifyItemOid?: string;
  parentCodedValue?: string;
}

export interface Codelist {
  codelistId: string;
  codelistName: string;
  dataType: DataType;
  nciCodelistCode?: string;
  parentItemOid?: string;
  subsetOfCodelistId?: string;
  items: CodelistItem[];
  customProperties?: Record<string, any>;
}

export interface MethodDefinition {
  methodOid: string;
  name: string;
  type: string;
  description?: string;
  expression?: string;
}

export interface AdamMapping {
  dataset: string;
  variable: string;
  nciVariableCode?: string;
  sasFieldName?: string;
  sasLabel?: string;
  core?: AdamCore;
  role?: string;
  /** ADaM variable type, e.g. "Char" or "Num". */
  type?: string;
  /** SAS field length for character variables. */
  length?: number;
  /** Significant digits for numeric variables. */
  significantDigits?: number;
  /** Define-XML 2.1 origin element for this variable in the analysis dataset. */
  origin?: VariableOrigin;
  /** OID reference to a SubmissionComment entry in SubmissionMetadata.comments. */
  commentOid?: string;
  /** Predecessor variable reference (ADaM traceability). */
  predecessor?: string;
  /** OID reference to a SubmissionDerivation for this variable's computation. */
  derivationOid?: string;
  /**
   * True when this mapping entry represents a Value Level Metadata (VLM) row.
   * VLM rows are aggregated under SubmissionMetadata.adamVariableMetadata.
   */
  isVlm?: boolean;
}

export interface SdtmDatasetMetadata {
  domain: string;
  label: string;
  class: SdtmDatasetClass;
  structure: string;
  keyVariables?: string[];
  repeating?: boolean;
  description?: string;
  /** OID of the CDISC standard version this domain belongs to (e.g. "STD.1"). */
  standardOid?: string;
  /** Whether this domain is archived / superseded. */
  archivedFlag?: boolean;
  /** Hyperlink to the dataset's define leaf document or external reference. */
  leafHref?: string;
  /** True for reference data domains (e.g. TS, TI, TX). */
  isReferenceData?: boolean;
  /** OID reference to a SubmissionComment for this dataset. */
  commentOid?: string;
  /** Explicit flag indicating the dataset exists in the define but contains no data. */
  hasNoData?: boolean;
}

export interface AdamDatasetMetadata {
  dataset: string;
  label: string;
  class: AdamDatasetClass;
  structure: string;
  keyVariables?: string[];
  repeating?: boolean;
  description?: string;
  /** OID of the CDISC standard version this dataset belongs to (e.g. "STD.2"). */
  standardOid?: string;
  /** Whether this dataset is archived / superseded. */
  archivedFlag?: boolean;
  /** Hyperlink to the dataset's define leaf document or external reference. */
  leafHref?: string;
  /** Tabulation or Analysis. */
  purpose?: DatasetPurpose;
  /** Human-readable description of the analysis type, e.g. "Primary Efficacy". */
  analysisType?: string;
  /** OID reference to a SubmissionComment for this dataset. */
  commentOid?: string;
  /** Explicit flag indicating the dataset exists in the define but contains no data. */
  hasNoData?: boolean;
}

export interface SubmissionDerivation {
  derivationId: string;
  label: string;
  description: string;
  expression?: string;
  inputVariables?: string[];
  methodOid?: string;
  /** OIDs or variable names produced by this derivation. */
  outputVariables?: string[];
  /** Human-readable description of the derivation source or rationale. */
  sourceText?: string;
  /** Broad category of derivation algorithm. */
  type?: "Computation" | "Imputation" | "Transpose" | "Other";
}

/**
 * A shared, referenceable comment entry. Dataset and variable metadata nodes
 * reference these by OID (commentOid) to avoid repeating large text blocks.
 * Recommended OID format: "CMT.<domain>.<context>" e.g. "CMT.DM.SUBJID".
 */
export interface SubmissionComment {
  /** Stable identifier, e.g. "CMT.DM.SUBJID". */
  commentOid: string;
  /** Plain-text comment content. */
  text: string;
  /** Optional localized versions of the comment text. */
  translatedText?: TranslatedText;
}

/**
 * References a CDISC standard version used in the submission.
 * Recommended OID format: "STD.<N>" e.g. "STD.1".
 */
export interface SubmissionStandard {
  /** Stable identifier, e.g. "STD.1". */
  standardOid: string;
  /** Standard name, e.g. "SDTMIG" or "ADaMIG". */
  name: string;
  /** Version string, e.g. "3.4" or "1.3". */
  version: string;
  /** Whether this standard reference is in draft or final status. */
  status?: "Draft" | "Final";
}

/**
 * A Value Level Metadata (VLM) row for an SDTM variable.
 * Each row describes a specific-value context (whereClause) within a
 * parent item's SDTM mapping, enabling finer-grained submission metadata.
 * Recommended OID format: "VLM.<domain>.<variable>.<context>".
 */
export interface SdtmVariableMetadata {
  /** Stable identifier for this VLM row, e.g. "VLM.DM.RACE.WHITE". */
  vlmOid: string;
  /** The CrfItem.itemOid this VLM row is scoped to. */
  parentItemOid: string;
  /** Human-readable WHERE clause condition, e.g. "RACE = 'WHITE'". */
  whereClause?: string;
  /** The SDTM mapping that applies within this value context. */
  sdtmMapping: SdtmMapping;
}

/**
 * A Value Level Metadata (VLM) row for an ADaM variable.
 * Recommended OID format: "VLM.<dataset>.<variable>.<context>".
 */
export interface AdamVariableMetadata {
  /** Stable identifier for this VLM row, e.g. "VLM.ADSL.RACE.WHITE". */
  vlmOid: string;
  /** The CrfItem.itemOid this VLM row is scoped to. */
  parentItemOid: string;
  /** Human-readable WHERE clause condition. */
  whereClause?: string;
  /** The ADaM mapping that applies within this value context. */
  adamMapping: AdamMapping;
}

export interface SubmissionMetadata {
  sdtmDatasets?: SdtmDatasetMetadata[];
  adamDatasets?: AdamDatasetMetadata[];
  sdtmDerivations?: SubmissionDerivation[];
  adamDerivations?: SubmissionDerivation[];
  /** Registry of SDTM Value Level Metadata rows, keyed by vlmOid. */
  sdtmVariableMetadata?: SdtmVariableMetadata[];
  /** Registry of ADaM Value Level Metadata rows, keyed by vlmOid. */
  adamVariableMetadata?: AdamVariableMetadata[];
  /** Shared comment registry; entries are referenced by commentOid from dataset/variable metadata. */
  comments?: SubmissionComment[];
  /** CDISC standard version references used across this submission package. */
  standards?: SubmissionStandard[];
}
