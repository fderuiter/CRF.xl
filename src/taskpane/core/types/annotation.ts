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
  RANGE = "Range",
  REGION = "Region",
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
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Optional metadata for type-specific properties. */
  metadata?: Record<string, any>;
}
