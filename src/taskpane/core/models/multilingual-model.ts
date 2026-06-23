/**
 * @issue #28
 */
import { TranslatedText, TranslationUnit, TranslationStatus } from "../types/common";

/**
 * Type guard to determine if a localized value is a structured TranslationUnit.
 */
export function isTranslationUnit(val: unknown): val is TranslationUnit {
  return (
    typeof val === "object" &&
    val !== null &&
    "value" in val &&
    "status" in val &&
    "lastUpdated" in val
  );
}

/**
 * Deterministic fallback logic to retrieve a displayable string from multilingual content.
 * Fallback Chain:
 * 1. Requested Locale (exact match)
 * 2. Base Locale (project default)
 * 3. First available non-empty locale
 * 4. Empty string
 *
 * @param content The multilingual content container.
 * @param locale The desired locale code (e.g., 'fr-FR').
 * @param baseLocale The project's primary locale code (e.g., 'en-US').
 */
export function getTranslationValue(
  content: TranslatedText | undefined,
  locale: string,
  baseLocale: string
): string {
  if (!content) {
    return "";
  }

  // 1. Try Requested Locale
  const requested = content[locale];
  if (requested !== undefined) {
    const val = isTranslationUnit(requested) ? requested.value : requested;
    if (val.trim() !== "") return val;
  }

  // 2. Try Base Locale
  const base = content[baseLocale];
  if (base !== undefined) {
    const val = isTranslationUnit(base) ? base.value : base;
    if (val.trim() !== "") return val;
  }

  // 3. Try First available non-empty
  for (const key in content) {
    const entry = content[key];
    const val = isTranslationUnit(entry) ? entry.value : entry;
    if (val && val.trim() !== "") {
      return val;
    }
  }

  return "";
}

/**
 * Creates a new TranslationUnit with the current timestamp.
 */
export function createTranslationUnit(
  value: string,
  status: TranslationStatus = TranslationStatus.Original
): TranslationUnit {
  return {
    value,
    status,
    lastUpdated: new Date().toISOString(),
  };
}
