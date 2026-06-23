/**
 * @issue #39, #40
 */
import { TranslatedText } from "../types/common";
import { TranslationStatus, TranslationModel, StudyLinguisticCompleteness } from "../types/linguistics";

/**
 * Locale-aware linguistic engine providing utility, normalization, and fallback logic.
 */
export class LinguisticService {
  private static readonly DECODE_REGEX = /^decode\s*\(([^)]+)\)$/i;
  private static readonly LABEL_REGEX = /^(?:label|question(?:\s*\/)?\s*text)\s*\(([^)]+)\)$/i;
  private static readonly INSTRUCTIONS_REGEX = /^instructions\s*\(([^)]+)\)$/i;

  /**
   * Normalizes a locale string to BCP 47 format (e.g., "es-es" -> "es-ES").
   */
  public static normalizeLocale(locale: string): string {
    if (!locale) return "";
    const parts = locale.split(/[-_]/);
    if (parts.length === 1) return parts[0].toLowerCase();
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }

  /**
   * Discovers the locale from a header string based on known patterns.
   */
  public static discoverLocaleFromHeader(header: string): { locale: string; type: "decode" | "label" | "instruction" } | null {
    const trimmed = header.trim();

    let match = trimmed.match(this.DECODE_REGEX);
    if (match) return { locale: this.normalizeLocale(match[1].trim()), type: "decode" };

    match = trimmed.match(this.LABEL_REGEX);
    if (match) return { locale: this.normalizeLocale(match[1].trim()), type: "label" };

    match = trimmed.match(this.INSTRUCTIONS_REGEX);
    if (match) return { locale: this.normalizeLocale(match[1].trim()), type: "instruction" };

    return null;
  }

  /**
   * Resolves content for a target locale with fallback logic.
   */
  public static resolveTranslation(
    translations: TranslatedText,
    targetLocale: string,
    defaultLocale: string
  ): TranslationModel {
    const normalizedTarget = this.normalizeLocale(targetLocale);
    const normalizedDefault = this.normalizeLocale(defaultLocale);

    // 1. Direct match
    if (translations[normalizedTarget]) {
      return {
        locale: normalizedTarget,
        status: TranslationStatus.COMPLETE,
        content: translations[normalizedTarget],
        isFallback: false,
      };
    }

    // 2. Fallback to default
    if (translations[normalizedDefault]) {
      return {
        locale: normalizedDefault,
        status: TranslationStatus.COMPLETE, // Or should it be PARTIAL if it's a fallback?
        content: translations[normalizedDefault],
        isFallback: true,
      };
    }

    // 3. Last resort: any available translation
    const availableLocales = Object.keys(translations);
    if (availableLocales.length > 0) {
      const firstLocale = availableLocales[0];
      return {
        locale: firstLocale,
        status: TranslationStatus.PARTIAL,
        content: translations[firstLocale],
        isFallback: true,
      };
    }

    // 4. Missing
    return {
      locale: normalizedTarget,
      status: TranslationStatus.MISSING,
      content: "",
      isFallback: false,
    };
  }

  /**
   * Checks if a translation is missing for a target locale.
   */
  public static isTranslationMissing(translations: TranslatedText, targetLocale: string): boolean {
    const normalized = this.normalizeLocale(targetLocale);
    return !translations[normalized] || translations[normalized].trim() === "";
  }

  /**
   * Calculates completeness metrics for a set of items across multiple locales.
   */
  public static calculateCompleteness(
    items: Array<{ oid: string; translations: TranslatedText }>,
    supportedLocales: string[]
  ): StudyLinguisticCompleteness {
    const totalItems = items.length;
    const missingLocales: Record<string, string[]> = {};
    let totalTranslated = 0;

    supportedLocales.forEach((locale) => {
      missingLocales[locale] = [];
    });

    items.forEach((item) => {
      let isFullyTranslated = true;
      supportedLocales.forEach((locale) => {
        if (this.isTranslationMissing(item.translations, locale)) {
          missingLocales[locale].push(item.oid);
          isFullyTranslated = false;
        }
      });
      if (isFullyTranslated) totalTranslated++;
    });

    return {
      totalItems,
      translatedItems: totalTranslated,
      completenessPercentage: totalItems > 0 ? (totalTranslated / totalItems) * 100 : 100,
      missingLocales,
    };
  }
}
