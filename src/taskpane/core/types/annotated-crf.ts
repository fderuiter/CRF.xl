/**
 * @issue #78
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
