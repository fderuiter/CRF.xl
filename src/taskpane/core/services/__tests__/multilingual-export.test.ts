/**
 * @issue #39
 */
import { LinguisticService } from "../linguistics-service";
import { ExportMode } from "../../types/linguistics";

describe("LinguisticService - Multilingual Export", () => {
  const translations = {
    "en-US": "Weight",
    "es-ES": "Peso",
  };

  describe("getExportTranslations", () => {
    it("should return only primary locale in PRIMARY_ONLY mode", () => {
      const options = {
        mode: ExportMode.PRIMARY_ONLY,
        primaryLocale: "es-ES",
      };
      const result = LinguisticService.getExportTranslations(translations, options, "en-US");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        locale: "es-ES",
        content: "Peso",
        isFallback: false,
      });
    });

    it("should return primary and secondary in BILINGUAL mode", () => {
      const options = {
        mode: ExportMode.BILINGUAL,
        primaryLocale: "en-US",
        secondaryLocale: "es-ES",
      };
      const result = LinguisticService.getExportTranslations(translations, options, "en-US");
      expect(result).toHaveLength(2);
      expect(result[0].locale).toBe("en-US");
      expect(result[1].locale).toBe("es-ES");
    });

    it("should handle fallbacks in BILINGUAL mode", () => {
      const options = {
        mode: ExportMode.BILINGUAL,
        primaryLocale: "fr-FR",
        secondaryLocale: "es-ES",
      };
      const result = LinguisticService.getExportTranslations(translations, options, "en-US");
      expect(result).toHaveLength(2);
      expect(result[0].isFallback).toBe(true);
      expect(result[0].content).toBe("Weight"); // Falls back to default en-US
      expect(result[1].isFallback).toBe(false);
      expect(result[1].content).toBe("Peso");
    });

    it("should return all available locales in ALL mode", () => {
      const options = {
        mode: ExportMode.ALL,
        primaryLocale: "en-US",
      };
      const result = LinguisticService.getExportTranslations(translations, options, "en-US");
      expect(result).toHaveLength(2);
      const locales = result.map((r) => r.locale);
      expect(locales).toContain("en-US");
      expect(locales).toContain("es-ES");
    });
  });
});
