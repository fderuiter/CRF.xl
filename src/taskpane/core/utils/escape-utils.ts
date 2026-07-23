/**
 * Shared escaping and decoding helpers for clinical study configurations, CDISC ODM XML, and PDF.
 * Consolidates historical character mapping quirks for bug-for-bug preservation.
 *
 * @issue #433
 */

/**
 * Shared RegExp escaping helper that preserves dynamic character patterns used in numerical locales and importing routines.
 * @param value The string containing the regular expression pattern to escape.
 * @returns The escaped regular expression string.
 */
export function escapeRegExp(value: string): string {
  if (!value) return "";
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Shared XML escaping helper that strips standard U+0000-U+001F control characters (excluding allowed XML whitespace)
 * and encodes standard XML entities.
 * @param unsafe The unsafe string to escape for XML.
 * @returns The escaped XML string.
 */
export function escapeXml(unsafe: string): string {
  if (!unsafe) return "";

  // 1. Strip prohibited control characters in U+0000-U+001F (excluding allowed XML 1.0 whitespace)
  // eslint-disable-next-line no-control-regex
  const stripped = unsafe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 2. Escape the 5 standard XML entities
  return stripped.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

/**
 * Shared HTML escaping helper that duplicates existing behavior by encoding only
 * ampersand, less-than, double-quote, and single-quote characters while explicitly leaving greater-than signs unescaped.
 * @param unsafe The unsafe string to escape for HTML.
 * @returns The HTML-escaped string with greater-than signs left unescaped.
 */
export function escapeHtml(unsafe: string): string {
  return (unsafe || "").toString().replace(/[&<"']/g, (m) => {
    switch (m) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return m;
    }
  });
}

/**
 * Shared XML decoding helper to resolve entity references back to standard text during clinical data import.
 * @param value The XML string containing entities to decode.
 * @returns The decoded plain text string.
 */
export function decodeXml(value: string): string {
  if (!value) return "";
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
