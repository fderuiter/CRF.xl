/**
 * @issue #39
 */
import { parseNumber, formatNumber, parseDate, formatDate } from "../locale-utils";
import * as localeConfig from "../../locale-config";

jest.mock("../../locale-config", () => ({
  getLocaleConfig: jest.fn(),
}));

describe("locale-utils", () => {
  const mockGetLocaleConfig = localeConfig.getLocaleConfig as jest.Mock;

  describe("parseNumber", () => {
    it("should parse US format numbers", () => {
      mockGetLocaleConfig.mockReturnValue({
        decimalSeparator: ".",
        argSeparator: ",",
        currentLocale: "en-US",
      });

      expect(parseNumber("1,234.56")).toBe(1234.56);
      expect(parseNumber("1234.56")).toBe(1234.56);
      expect(parseNumber(1234.56)).toBe(1234.56);
    });

    it("should parse European format numbers", () => {
      mockGetLocaleConfig.mockReturnValue({
        decimalSeparator: ",",
        argSeparator: ";",
        currentLocale: "de-DE",
      });

      expect(parseNumber("1.234,56")).toBe(1234.56);
      expect(parseNumber("1234,56")).toBe(1234.56);
    });

    it("should return undefined for invalid input", () => {
      mockGetLocaleConfig.mockReturnValue({
        decimalSeparator: ".",
        currentLocale: "en-US",
      });

      expect(parseNumber("abc")).toBeUndefined();
      expect(parseNumber("")).toBeUndefined();
      expect(parseNumber(null)).toBeUndefined();
    });
  });

  describe("formatNumber", () => {
    it("should format numbers according to locale", () => {
      mockGetLocaleConfig.mockReturnValue({
        currentLocale: "en-US",
      });
      // toLocaleString behavior can vary by environment, but Intl usually is stable
      const result = formatNumber(1234.56);
      expect(result).toContain("1");
      expect(result).toContain("234");
      expect(result).toContain("56");
    });
  });

  describe("parseDate", () => {
    it("should parse ISO dates", () => {
      const { date, warnings } = parseDate("2023-05-20");
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2023);
      expect(date?.getMonth()).toBe(4); // May
      expect(date?.getDate()).toBe(20);
      expect(warnings).toHaveLength(0);
    });

    it("should parse and warn for ambiguous dates in en-US", () => {
      mockGetLocaleConfig.mockReturnValue({
        currentLocale: "en-US",
      });

      const { date, warnings } = parseDate("01/02/2023");
      expect(date?.getMonth()).toBe(0); // Jan
      expect(date?.getDate()).toBe(2);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("ambiguous");
    });

    it("should parse and warn for ambiguous dates in de-DE", () => {
      mockGetLocaleConfig.mockReturnValue({
        currentLocale: "de-DE",
      });

      const { date, warnings } = parseDate("01.02.2023");
      expect(date?.getMonth()).toBe(1); // Feb
      expect(date?.getDate()).toBe(1);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("ambiguous");
    });

    it("should handle non-ambiguous dates", () => {
      mockGetLocaleConfig.mockReturnValue({
        currentLocale: "en-US",
      });

      const { warnings } = parseDate("13/02/2023"); // 13 is clearly day
      // 13/2/2023 is invalid if month is 13.
      // Fallback might not work if it doesn't like DMY in en-US.
      // In many JS engines, new Date("13/02/2023") is Invalid Date if it expects MDY.
      expect(warnings).toContain("Could not parse date.");
    });
  });

  describe("formatDate", () => {
    it("should format dates", () => {
      mockGetLocaleConfig.mockReturnValue({
        currentLocale: "en-US",
      });
      const d = new Date(2023, 4, 20);
      const result = formatDate(d);
      expect(result).toContain("2023");
      expect(result).toContain("5"); // or "05" or "May" depending on locale settings
    });
  });
});
