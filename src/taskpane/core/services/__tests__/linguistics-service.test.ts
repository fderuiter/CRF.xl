/**
 * @issue #39
 */
import { LinguisticService } from "../linguistics-service";
import { TranslationStatus } from "../../types/linguistics";

describe("LinguisticService", () => {
  describe("normalizeLocale", () => {
    it("should normalize locale strings correctly", () => {
      expect(LinguisticService.normalizeLocale("en-us")).toBe("en-US");
      expect(LinguisticService.normalizeLocale("ES-ES")).toBe("es-ES");
      expect(LinguisticService.normalizeLocale("fr_fr")).toBe("fr-FR");
      expect(LinguisticService.normalizeLocale("en")).toBe("en");
      expect(LinguisticService.normalizeLocale("")).toBe("");
    });
  });

  describe("discoverLocaleFromHeader", () => {
    it("should discover locales from Decode headers", () => {
      expect(LinguisticService.discoverLocaleFromHeader("Decode (es-ES)")).toEqual({
        locale: "es-ES",
        type: "decode",
      });
      expect(LinguisticService.discoverLocaleFromHeader("decode(fr-fr)")).toEqual({
        locale: "fr-FR",
        type: "decode",
      });
    });

    it("should discover locales from Label headers", () => {
      expect(LinguisticService.discoverLocaleFromHeader("Label (es-ES)")).toEqual({
        locale: "es-ES",
        type: "label",
      });
      expect(LinguisticService.discoverLocaleFromHeader("Question / Text (fr-FR)")).toEqual({
        locale: "fr-FR",
        type: "label",
      });
    });

    it("should discover locales from Instructions headers", () => {
      expect(LinguisticService.discoverLocaleFromHeader("Instructions (es-ES)")).toEqual({
        locale: "es-ES",
        type: "instruction",
      });
    });

    it("should return null for non-locale headers", () => {
      expect(LinguisticService.discoverLocaleFromHeader("Variable Name")).toBeNull();
      expect(LinguisticService.discoverLocaleFromHeader("Decode")).toBeNull();
    });
  });

  describe("resolveTranslation", () => {
    const translations = {
      "en-US": "Weight",
      "es-ES": "Peso",
    };

    it("should resolve direct match", () => {
      const result = LinguisticService.resolveTranslation(translations, "es-ES", "en-US");
      expect(result).toEqual({
        locale: "es-ES",
        status: TranslationStatus.COMPLETE,
        content: "Peso",
        isFallback: false,
      });
    });

    it("should resolve via fallback to default", () => {
      const result = LinguisticService.resolveTranslation(translations, "fr-FR", "en-US");
      expect(result).toEqual({
        locale: "en-US",
        status: TranslationStatus.COMPLETE,
        content: "Weight",
        isFallback: true,
      });
    });

    it("should resolve via fallback to any available if default is missing", () => {
      const partialTranslations = { "es-ES": "Peso" };
      const result = LinguisticService.resolveTranslation(partialTranslations, "fr-FR", "en-US");
      expect(result).toEqual({
        locale: "es-ES",
        status: TranslationStatus.PARTIAL,
        content: "Peso",
        isFallback: true,
      });
    });

    it("should return missing if no translations available", () => {
      const result = LinguisticService.resolveTranslation({}, "fr-FR", "en-US");
      expect(result.status).toBe(TranslationStatus.MISSING);
    });
  });

  describe("isTranslationMissing", () => {
    const translations = { "en-US": "Weight", "es-ES": "" };

    it("should detect missing translations", () => {
      expect(LinguisticService.isTranslationMissing(translations, "fr-FR")).toBe(true);
      expect(LinguisticService.isTranslationMissing(translations, "es-ES")).toBe(true);
      expect(LinguisticService.isTranslationMissing(translations, "en-US")).toBe(false);
    });
  });
});
