/**
 * @issue #84
 */
import { TranslatedText } from "./common";

/**
 * Supported annotation types for clinical metadata and workbook notes.
 */
export enum AnnotationType {
  SDTM = "SDTM",
  ADAM = "ADaM",
  ORIGIN = "Origin",
  COMMENT = "Comment",
  VALIDATION = "Validation",
}

/**
 * Defines the scope of the annotation.
 */
export enum AnnotationTargetType {
  CELL = "Cell",
}

/**
 * Hybrid anchoring model combining physical workbook references with logical clinical context.
 */
export interface AnnotationAnchor {
  /** Physical workbook address (e.g., "Sheet1!A1:B2"). */
  address: string;
  /** Logical contextual reference (e.g., OID of the item, group, or form). */
  logicalId?: string;
  /** Sheet name where the annotation is anchored. */
  sheetName: string;
}

export type LifecycleState = "draft" | "under_review" | "resolved";

/**
 * Core annotation model for workbook interaction and clinical metadata.
 */
export interface Annotation {
  id: string;
  type: AnnotationType;
  targetType: AnnotationTargetType;
  anchor: AnnotationAnchor;
  content: string | TranslatedText;
  author?: string;
  /** ISO 8601 timestamp of creation. */
  timestamp: string;
  /** ISO 8601 timestamp of last update. */
  updatedTimestamp?: string;
  /** Schema version for the annotation. */
  version: number;
  /** Optional metadata for type-specific properties. */
  metadata?: {
    studyOid?: string;
    lifecycleState?: LifecycleState;
    anchoringHash?: string;
    [key: string]: any;
  };
}
