/**
 * @issue #28
 */
export interface LocaleConfig {
  argSeparator: string;
  decimalSeparator: string;
  currentLocale: string;
}

let currentLocaleConfig: LocaleConfig = {
  argSeparator: ",",
  decimalSeparator: ".",
  currentLocale: "en-US",
};

/**
 * Initializes the locale configuration dynamically based on the detected environment locale.
 * Determines the localized argument separator and decimal separator.
 */
export function initLocale(locale: string) {
  try {
    const testNum = 1.5;
    const formatted = testNum.toLocaleString(locale);

    // If the formatted number uses a comma for decimal, it's a European-style locale
    const decimalSeparator = formatted.includes(",") ? "," : ".";

    // In locales where decimal is comma, argument separator must be semicolon to avoid ambiguity in Excel formulas.
    const argSeparator = decimalSeparator === "," ? ";" : ",";

    currentLocaleConfig = {
      argSeparator,
      decimalSeparator,
      currentLocale: locale,
    };
  } catch (e) {
    // Fallback to en-US if locale formatting fails
    currentLocaleConfig = {
      argSeparator: ",",
      decimalSeparator: ".",
      currentLocale: "en-US",
    };
  }
}

export function getLocaleConfig(): LocaleConfig {
  return currentLocaleConfig;
}
