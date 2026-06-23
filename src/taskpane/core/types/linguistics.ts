/**
 * @issue #39
 */
import { TranslatedText } from "./common";

/**
 * States of a locale resolution attempt (distinct from per-unit TranslationStatus in common.ts).
 */
export enum LocaleResolutionStatus {
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
  status: LocaleResolutionStatus;
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
