/**
 * @issue #39
 */
import {
  getTranslationValue,
  isTranslationUnit,
  createTranslationUnit,
} from "../multilingual-model";
import { TranslationStatus, TranslatedText } from "../../types/common";

describe("Multilingual Content Model", () => {
  describe("isTranslationUnit", () => {
    it("should return true for valid TranslationUnit objects", () => {
      const unit = {
        value: "Test",
        status: TranslationStatus.Translated,
        lastUpdated: "2023-10-27T10:00:00Z",
      };
      expect(isTranslationUnit(unit)).toBe(true);
    });

    it("should return false for strings", () => {
      expect(isTranslationUnit("Just a string")).toBe(false);
    });

    it("should return false for partial objects", () => {
      expect(isTranslationUnit({ value: "No status" })).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isTranslationUnit(null)).toBe(false);
      expect(isTranslationUnit(undefined)).toBe(false);
    });
  });

  describe("getTranslationValue (Fallback Logic)", () => {
    const baseLocale = "en-US";
    const targetLocale = "fr-FR";

    it("should return the exact match if available (Backward Compatible)", () => {
      const content: TranslatedText = {
        "en-US": "Weight",
        "fr-FR": "Poids",
      };
      expect(getTranslationValue(content, targetLocale, baseLocale)).toBe("Poids");
    });

    it("should return the exact match if available (Enhanced Model)", () => {
      const content: TranslatedText = {
        "en-US": createTranslationUnit("Weight"),
        "fr-FR": createTranslationUnit("Poids", TranslationStatus.Translated),
      };
      expect(getTranslationValue(content, targetLocale, baseLocale)).toBe("Poids");
    });

    it("should fallback to base locale if requested locale is missing", () => {
      const content: TranslatedText = {
        "en-US": "Weight",
        "es-ES": "Peso",
      };
      expect(getTranslationValue(content, targetLocale, baseLocale)).toBe("Weight");
    });

    it("should fallback to base locale if requested locale is empty", () => {
      const content: TranslatedText = {
        "en-US": "Weight",
        "fr-FR": "",
      };
      expect(getTranslationValue(content, targetLocale, baseLocale)).toBe("Weight");
    });

    it("should fallback to the first available non-empty locale if base locale is also missing", () => {
      const content: TranslatedText = {
        "es-ES": "Peso",
        "de-DE": "Gewicht",
      };
      // Note: Object.keys order is generally insertion order in JS for non-numeric keys
      expect(getTranslationValue(content, targetLocale, baseLocale)).toBe("Peso");
    });

    it("should return empty string if no translations are available", () => {
      expect(getTranslationValue({}, targetLocale, baseLocale)).toBe("");
      expect(getTranslationValue(undefined, targetLocale, baseLocale)).toBe("");
    });

    it("should handle mixed string and TranslationUnit content", () => {
      const content: TranslatedText = {
        "en-US": "Weight",
        "fr-FR": createTranslationUnit("Poids")
      };
      expect(getTranslationValue(content, "en-US", baseLocale)).toBe("Weight");
      expect(getTranslationValue(content, "fr-FR", baseLocale)).toBe("Poids");
    });
  });

  describe("createTranslationUnit", () => {
    it("should create a unit with correct value and default status", () => {
      const unit = createTranslationUnit("Hello");
      expect(unit.value).toBe("Hello");
      expect(unit.status).toBe(TranslationStatus.Original);
      expect(unit.lastUpdated).toBeDefined();
      // Verify it's a valid ISO string
      expect(new Date(unit.lastUpdated).toISOString()).toBe(unit.lastUpdated);
    });

    it("should support custom status", () => {
      const unit = createTranslationUnit("Bonjour", TranslationStatus.Translated);
      expect(unit.status).toBe(TranslationStatus.Translated);
    });
  });
});
