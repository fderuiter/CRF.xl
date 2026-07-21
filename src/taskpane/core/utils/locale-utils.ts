import { getLocaleConfig } from "../locale-config";

/**
 * @issue #39
 */

/**
 * Formats a number according to the current locale.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const { currentLocale } = getLocaleConfig();
  return new Intl.NumberFormat(currentLocale, options).format(value);
}

/**
 * Parses a localized number string into a standard JavaScript number.
 */
export function parseNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;

  const { decimalSeparator } = getLocaleConfig();

  // Clean string: remove whitespace and non-breaking spaces
  let cleanValue = String(value).replace(/\s/g, "");

  // Identify group separator (heuristic: if it's not the decimal separator)
  const groupSeparator = decimalSeparator === "." ? "," : ".";

  // Remove group separators
  const escapedGroupSeparator = groupSeparator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  cleanValue = cleanValue.replace(new RegExp(escapedGroupSeparator, "g"), "");

  // Replace decimal separator with standard point
  if (decimalSeparator !== ".") {
    const escapedDecimalSeparator = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleanValue = cleanValue.replace(new RegExp(escapedDecimalSeparator), ".");
  }

  const result = parseFloat(cleanValue);
  return isNaN(result) ? undefined : result;
}

/**
 * Formats a date according to the current locale.
 */
export function formatDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const { currentLocale } = getLocaleConfig();
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(currentLocale, options).format(date);
}

/**
 * Parses a localized date string and checks for ambiguity.
 * Returns the parsed Date and any warnings if the format was ambiguous.
 */
export function parseDate(value: string): { date: Date | null; warnings: string[] } {
  if (!value) return { date: null, warnings: [] };

  const { currentLocale } = getLocaleConfig();
  const warnings: string[] = [];

  // Try ISO format first (unambiguous)
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    return { date: d, warnings: [] };
  }

  // Common separators: / . -
  const parts = value.split(/[\/\.\-]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0]);
    const p2 = parseInt(parts[1]);
    const p3 = parseInt(parts[2]);

    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      // Handle YYYY at start or end
      let year = -1,
        month = -1,
        day = -1;
      let format = "";

      if (p1 > 1000) {
        // YYYY-MM-DD
        year = p1;
        month = p2;
        day = p3;
        format = "YYYY-MM-DD";
      } else if (p3 > 1000) {
        // XX-XX-YYYY
        year = p3;

        // Determine if MDY or DMY based on locale
        const isUS = currentLocale.startsWith("en-US");

        if (isUS) {
          month = p1;
          day = p2;
          format = "MM-DD-YYYY";
        } else {
          day = p1;
          month = p2;
          format = "DD-MM-YYYY";
        }

        // Check for ambiguity if both could be months
        if (p1 <= 12 && p2 <= 12 && p1 !== p2) {
          warnings.push(
            `Date "${value}" is ambiguous in locale ${currentLocale}. Interpreted as ${format}.`
          );
        }
      }

      if (year !== -1) {
        const date = new Date(year, month - 1, day);
        // Validate date (e.g. avoid Feb 31)
        if (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        ) {
          return { date, warnings };
        }
      }
    }
  }

  // Fallback to native Date constructor
  const fallbackDate = new Date(value);
  if (!isNaN(fallbackDate.getTime())) {
    return { date: fallbackDate, warnings };
  }

  return { date: null, warnings: [...warnings, "Could not parse date."] };
}
