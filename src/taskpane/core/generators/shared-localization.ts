import { TranslatedText, ExportOptions, ExportMode } from "../types/index";
import { LinguisticService } from "../services/linguistics-service";

/**
 * Utility to safely fetch translated text with a fallback.
 * Supports BILINGUAL mode by joining translations with a slash.
 */
export function getTranslation(
  textObj: TranslatedText,
  lang: string,
  exportOptions?: ExportOptions
): string {
  if (exportOptions) {
    const translations = LinguisticService.getExportTranslations(textObj, exportOptions, lang);

    if (exportOptions.mode === ExportMode.BILINGUAL && translations.length >= 2) {
      return `${translations[0].content} / ${translations[1].content}`;
    }

    if (exportOptions.mode === ExportMode.ALL) {
      return translations.map((t) => `[${t.locale}] ${t.content}`).join(" | ");
    }

    if (translations.length > 0) {
      return translations[0].content;
    }
  }

  return textObj[lang] || textObj["en-US"] || Object.values(textObj)[0] || "";
}
