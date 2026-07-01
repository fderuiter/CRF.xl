/**
 * @issue #78, #184
 */
import { TranslatedText } from "./common";
import { DataType } from "./enums";

/**
 * Represents the type of annotation in an aCRF.
 */
export enum AcrfAnnotationType {
  SDTM = "SDTM",
  ADAM = "ADaM",
  RULE = "Rule",
  VALIDATION = "Validation",
  COMMENT = "Comment",
}

/**
 * A single annotation overlay for an aCRF field.
 */
export interface AcrfAnnotation {
  type: AcrfAnnotationType;
  label: string;
  content: string;
  /** Optional reference to a SubmissionComment OID. */
  commentOid?: string;
  /** Color for the annotation box, typically red for SDTM. */
  color?: string;
}

/**
 * A single item (field) within an aCRF form.
 */
export interface AcrfItem {
  itemOid: string;
  name: string;
  label: TranslatedText;
  dataType: DataType;
  mandatory: boolean;
  codelistId?: string;
  instructions?: TranslatedText;
  annotations: AcrfAnnotation[];
}

/**
 * A group of items within an aCRF form.
 */
export interface AcrfItemGroup {
  groupOid: string;
  name: string;
  label?: TranslatedText;
  items: AcrfItem[];
}

/**
 * A single form within an aCRF document.
 */
export interface AcrfForm {
  formOid: string;
  formName: string;
  itemGroups: AcrfItemGroup[];
}

/**
 * The complete intermediate document model for an Annotated CRF.
 */
export interface AnnotatedCrfDocument {
  protocolId: string;
  studyName: string;
  version: string;
  sponsor?: string;
  generatedAt: string;
  forms: AcrfForm[];
  /** Optional summary of validation issues to include in the header/appendix. */
  validationIssues?: any[];
}

/**
 * Diagnostic record for a single pipeline stage.
 */
export interface PipelineDiagnostic {
  stage: string;
  severity: "info" | "warning" | "error";
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Encapsulates the output of a specific pipeline stage.
 */
export interface PipelineStageResult<T> {
  stage: string;
  data: T;
  diagnostics: PipelineDiagnostic[];
  durationMs: number;
}

/**
 * Final manifest produced by the generation pipeline.
 */
export interface AnnotatedCrfPipelineManifest {
  pipelineVersion: string;
  generatedAt: string;
  protocolId: string;
  studyVersion: string;
  stages: string[];
  totalDurationMs: number;
  diagnostics: PipelineDiagnostic[];
  artifactHashes: Record<string, string>;
}

/**
 * The final result of the Annotated CRF generation pipeline.
 */
/**
 * A single verification issue for an aCRF.
 */
export interface AcrfVerificationIssue {
  severity: "error" | "warning";
  category: string;
  message: string;
  entityId?: string;
  location?: string;
}

/**
 * Result of the aCRF verification process.
 */
export interface AcrfVerificationResult {
  isValid: boolean;
  issues: AcrfVerificationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    totalChecks: number;
  };
}

export interface AnnotatedCrfPipelineResult {
  document: AnnotatedCrfDocument;
  manifest: AnnotatedCrfPipelineManifest;
  verificationResult?: AcrfVerificationResult;
  blob?: Blob;
}

/**
 * Interface for the export handoff stage.
 */
export interface AcrfExportHandoff {
  document: AnnotatedCrfDocument;
  format: "pdf" | "html";
  options?: any;
}
