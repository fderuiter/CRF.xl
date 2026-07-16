/**
 * @issue #39
 */

/**
 * States of a translation for a specific locale.
 */
export enum TranslationStatus {
  COMPLETE = "COMPLETE",
  MISSING = "MISSING",
  OUTDATED = "OUTDATED",
  PARTIAL = "PARTIAL",
}

/**
 * Shared infrastructure for language-aware content behavior.
 */
export interface LinguisticMetadata {
  baseLocale: string;
  supportedLocales: string[];
  fallbackChain: string[];
}

/**
 * Model representing the translation state of a specific content block.
 */
export interface TranslationModel {
  locale: string;
  status: TranslationStatus;
  content: string;
  isFallback: boolean;
}

/**
 * Utility to track completeness across the study.
 */
export interface StudyLinguisticCompleteness {
  totalItems: number;
  translatedItems: number;
  completenessPercentage: number;
  missingLocales: Record<string, string[]>; // locale -> OIDs
}

/**
 * Modes for multilingual export.
 */
export enum ExportMode {
  PRIMARY_ONLY = "PRIMARY_ONLY",
  BILINGUAL = "BILINGUAL",
  ALL = "ALL",
}

/**
 * Configuration for a specific export operation.
 */
export interface ExportOptions {
  mode: ExportMode;
  primaryLocale: string;
  secondaryLocale?: string;
}
