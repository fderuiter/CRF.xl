/**
 * @issue #39, #40
 */
import { TranslatedText } from "../types/common";
import {
  TranslationStatus,
  TranslationModel,
  StudyLinguisticCompleteness,
  ExportOptions,
  ExportMode,
} from "../types/linguistics";

/**
 * Locale-aware linguistic engine providing utility, normalization, and fallback logic.
 */
export class LinguisticService {
  /**
   * Normalizes a locale string to BCP 47 format (e.g., "es-es" -> "es-ES").
   * @param locale
   * @returns
   */
  public static normalizeLocale(locale: string): string {
    if (!locale) return "";
    const parts = locale.split(/[-_]/);
    if (parts.length === 1) return parts[0].toLowerCase();
    // Support region codes (e.g. en-US) but be careful with script tags (e.g. zh-Hans)
    const secondPart =
      parts[1].length === 2
        ? parts[1].toUpperCase()
        : parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    return `${parts[0].toLowerCase()}-${secondPart}`;
  }

  public static discoverLocaleFromHeader(
    header: string
  ): { locale: string; type: "decode" | "label" | "instruction" } | null {
    const trimmed = header.trim().toLowerCase();

    // Instead of regex, use simple string manipulation based on known patterns
    // e.g. "decode (en-US)"
    if (trimmed.startsWith("decode") && trimmed.includes("(") && trimmed.endsWith(")")) {
      const locale = trimmed.substring(trimmed.indexOf("(") + 1, trimmed.length - 1).trim();
      if (locale) return { locale: this.normalizeLocale(locale), type: "decode" };
    }

    if (
      (trimmed.startsWith("label") ||
        trimmed.startsWith("question / text") ||
        trimmed.startsWith("question/text")) &&
      trimmed.includes("(") &&
      trimmed.endsWith(")")
    ) {
      const locale = trimmed.substring(trimmed.indexOf("(") + 1, trimmed.length - 1).trim();
      if (locale) return { locale: this.normalizeLocale(locale), type: "label" };
    }

    if (trimmed.startsWith("instructions") && trimmed.includes("(") && trimmed.endsWith(")")) {
      const locale = trimmed.substring(trimmed.indexOf("(") + 1, trimmed.length - 1).trim();
      if (locale) return { locale: this.normalizeLocale(locale), type: "instruction" };
    }

    return null;
  }

  /**
   * Resolves content for a target locale with fallback logic.
   * @param translations
   * @param targetLocale
   * @param defaultLocale
   * @returns
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
        status: TranslationStatus.PARTIAL,
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
   * @param translations
   * @param targetLocale
   * @returns
   */
  public static isTranslationMissing(translations: TranslatedText, targetLocale: string): boolean {
    const normalized = this.normalizeLocale(targetLocale);
    return !translations[normalized] || translations[normalized].trim() === "";
  }

  /**
   * Calculates completeness metrics for a set of items across multiple locales.
   * @param items
   * @param supportedLocales
   * @returns
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

  /**
   * Returns a filtered set of translations based on ExportOptions.
   * Leverages resolveTranslation to handle fallbacks for missing content.
   * @param translations
   * @param options
   * @param defaultLocale
   * @returns
   */
  public static getExportTranslations(
    translations: TranslatedText,
    options: ExportOptions,
    defaultLocale: string
  ): Array<{ locale: string; content: string; isFallback: boolean }> {
    const results: Array<{ locale: string; content: string; isFallback: boolean }> = [];

    if (options.mode === ExportMode.PRIMARY_ONLY) {
      const resolved = this.resolveTranslation(translations, options.primaryLocale, defaultLocale);
      results.push({
        locale: resolved.locale,
        content: resolved.content,
        isFallback: resolved.isFallback,
      });
    } else if (options.mode === ExportMode.BILINGUAL) {
      const primary = this.resolveTranslation(translations, options.primaryLocale, defaultLocale);
      results.push({
        locale: primary.locale,
        content: primary.content,
        isFallback: primary.isFallback,
      });

      if (options.secondaryLocale) {
        const secondary = this.resolveTranslation(
          translations,
          options.secondaryLocale,
          defaultLocale
        );
        // Only push if different from primary or if we want both even if they fall back to same thing?
        // Usually in bilingual export we want both even if they are same due to fallback, to maintain structure.
        results.push({
          locale: secondary.locale,
          content: secondary.content,
          isFallback: secondary.isFallback,
        });
      }
    } else if (options.mode === ExportMode.ALL) {
      // For "ALL", we include every locale that has at least one entry in the study
      // or just all available for this specific item?
      // Given the requirement "Multi-locale appendix", it suggests all available.
      Object.keys(translations).forEach((locale) => {
        results.push({
          locale: this.normalizeLocale(locale),
          content: translations[locale],
          isFallback: false,
        });
      });
    }

    return results;
  }
}
