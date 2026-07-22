/**
 * @issue #28
 */
/**
 * ============================================================================
 * enums.ts
 * ============================================================================
 * Global literals, enums, and constants for the CRF.xl clinical engine.
 */

export enum DataType {
  TEXT = "Text",
  INTEGER = "Integer",
  FLOAT = "Float",
  DATE = "Date",
  TIME = "Time",
  DATETIME = "Datetime",
  PARTIAL_DATE = "PartialDate",
  PARTIAL_DATETIME = "PartialDatetime",
  BOOLEAN = "Boolean",
  CODELIST = "Codelist",
  FILE = "File",
  ANNOTATION = "Annotation",
  DISPLAY_ONLY = "DisplayOnly",
}

export enum PaperLayoutFormat {
  COMB = "Comb",
  CHECKBOX_LIST = "CheckboxList",
  RADIO_LIST = "RadioList",
  VAS = "VisualAnalogScale",
}

export enum GroupLayout {
  MATRIX = "Matrix",
}

export enum FormLayout {}

export enum PageLayout {
  LANDSCAPE = "Landscape",
}

export enum EventType {
  SCHEDULED = "Scheduled",
}

export enum SdtmCore {}

export enum FormType {}

export enum RangeValueType {}

export enum DictionaryType {}

export enum CodingTermType {}

export enum DataOrigin {
  COLLECTED = "Collected",
  DERIVED = "Derived",
  ASSIGNED = "Assigned",
  PRE_SPECIFIED = "Pre-Specified",
  EXTERNAL = "External",
  OTHER = "Other",
}

export enum CollectionMethod {}

export enum QuerySeverity {}

export enum SignatureMeaning {}

export enum SdvTier {}

export enum LabType {}

export enum SystemTriggerType {}

export enum AggregateFunction {}

export enum VasOrientation {}

export enum DateImputationRule {}

export enum AdamCore {
  REQUIRED = "Required",
}

export enum DatasetPurpose {
  TABULATION = "Tabulation",
  ANALYSIS = "Analysis",
}

/**
 * Define-XML 2.1 origin vocabulary for submission-layer variable metadata.
 * Distinct from DataOrigin (CRF collection context) — this reflects the
 * dataset-level origin element used in a regulatory submission define file.
 */
export enum VariableOrigin {}

/**
 * SDTM dataset class vocabulary per SDTMIG.
 */
export enum SdtmDatasetClass {
  SPECIAL_PURPOSE = "SpecialPurpose",
}

/**
 * ADaM dataset class vocabulary per ADaMIG.
 */
export enum AdamDatasetClass {
  ADAM_BASIC_DATA_STRUCTURE = "ADaMBasicDataStructure",
}
