/**
 * @issue #93
 */
import { CdiscCtCodelist, CdiscCtPackage, CdiscCtTerm } from "./cdisc-api-service";

export interface CrfCodelistsRow {
  codelistId: string;
  codelistName: string;
  codedValue: string;
  decode: string;
  codelistOid: string;
  termOid: string;
  codelistVersion: string;
  source: string;
  sourcePackageOid: string;
  sourcePackageTitle: string;
}


type MappingWarningCode =
  | "unsupported_field"
  | "ambiguous_term_decode"
  | "lifecycle_conflict_requires_user_prompt";

interface MappingWarning {
  code: MappingWarningCode;
  message: string;
  path: string;
}

type MappingErrorCode = "invalid_payload" | "partial_payload" | "invalid_field";

interface MappingError {
  code: MappingErrorCode;
  message: string;
  path: string;
}

interface CdiscCtMappingSuccess {
  ok: true;
  rows: CrfCodelistsRow[];
  warnings: MappingWarning[];
}

export interface CdiscCtMappingFailure {
  ok: false;
  error: MappingError;
  warnings: MappingWarning[];
}

type CdiscCtMappingResult = CdiscCtMappingSuccess | CdiscCtMappingFailure;

export type LifecycleAction = "insert" | "overwrite" | "skip_identical" | "prompt_user";

interface LifecycleDecision {
  action: LifecycleAction;
  row: CrfCodelistsRow;
  message: string;
}

interface LifecycleResult {
  decisions: LifecycleDecision[];
  rowsToUpsert: CrfCodelistsRow[];
  warnings: MappingWarning[];
}

const DEFAULT_SOURCE = "CDISC Library API";
const PACKAGE_KEYS = new Set([
  "packageOid",
  "oid",
  "name",
  "href",
  "title",
  "label",
  "effectiveDate",
]);
const CODELIST_KEYS = new Set([
  "codelistOid",
  "oid",
  "conceptId",
  "href",
  "submissionValue",
  "title",
  "name",
]);
const TERM_KEYS = new Set([
  "termOid",
  "oid",
  "conceptId",
  "href",
  "codedValue",
  "submissionValue",
  "decode",
  "title",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractOidFromHref(href: unknown): string {
  const text = asString(href);
  if (!text) {
    return "";
  }
  const segments = text.split("/").filter(Boolean);
  return segments.length === 0 ? "" : decodeURIComponent(segments[segments.length - 1]);
}

function normalizePackageOid(pkg: CdiscCtPackage): string {
  return (
    asString(pkg.packageOid) ||
    asString(pkg.name) ||
    asString(pkg.oid) ||
    extractOidFromHref(pkg.href)
  );
}

function normalizeCodelistOid(codelist: CdiscCtCodelist): string {
  return (
    asString(codelist.codelistOid) ||
    asString(codelist.conceptId) ||
    asString(codelist.oid) ||
    extractOidFromHref(codelist.href)
  );
}

function normalizeTermOid(term: CdiscCtTerm): string {
  return (
    asString(term.termOid) ||
    asString(term.conceptId) ||
    asString(term.oid) ||
    extractOidFromHref(term.href)
  );
}

function normalizePackageVersion(pkg: CdiscCtPackage, packageOid: string): string {
  const effectiveDate = asString(pkg.effectiveDate);
  if (effectiveDate) {
    return effectiveDate;
  }

  const matchedDate = packageOid.match(/(\d{4}-\d{2}-\d{2})$/);
  if (matchedDate) {
    return matchedDate[1];
  }

  return packageOid;
}

function collectUnsupportedFields(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  path: string,
  warnings: MappingWarning[]
): void {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.has(key) && key !== "_links" && key !== "type") {
      warnings.push({
        code: "unsupported_field",
        path: `${path}.${key}`,
        message: `Field '${key}' is currently not mapped into _Codelists rows.`,
      });
    }
  });
}

function rowsEqual(left: CrfCodelistsRow, right: CrfCodelistsRow): boolean {
  return (
    left.codelistId === right.codelistId &&
    left.codelistName === right.codelistName &&
    left.codedValue === right.codedValue &&
    left.decode === right.decode &&
    left.codelistOid === right.codelistOid &&
    left.termOid === right.termOid &&
    left.codelistVersion === right.codelistVersion &&
    left.source === right.source &&
    left.sourcePackageOid === right.sourcePackageOid &&
    left.sourcePackageTitle === right.sourcePackageTitle
  );
}

function compareVersion(left: string, right: string): number | null {
  if (left === right) {
    return 0;
  }

  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate > rightDate ? 1 : -1;
  }

  const leftSemver = left.match(/^(\d+)\.(\d+)\.(\d+)$/);
  const rightSemver = right.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (leftSemver && rightSemver) {
    const leftParts = leftSemver.slice(1).map((part) => Number.parseInt(part, 10));
    const rightParts = rightSemver.slice(1).map((part) => Number.parseInt(part, 10));
    for (let index = 0; index < leftParts.length; index += 1) {
      if (leftParts[index] > rightParts[index]) {
        return 1;
      }
      if (leftParts[index] < rightParts[index]) {
        return -1;
      }
    }
    return 0;
  }

  return null;
}

export function mapCdiscApiResponseToCrfCodelists(input: unknown): CdiscCtMappingResult {
  const warnings: MappingWarning[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      warnings,
      error: {
        code: "invalid_payload",
        path: "$",
        message: "Expected a CDISC mapping input object.",
      },
    };
  }

  const pkg = input.package;
  const codelists = input.codelists;
  const termsByCodelistOid = input.termsByCodelistOid;
  const source = asString(input.source) || DEFAULT_SOURCE;

  if (!isRecord(pkg)) {
    return {
      ok: false,
      warnings,
      error: {
        code: "partial_payload",
        path: "$.package",
        message: "Package metadata is missing from the CDISC response bundle.",
      },
    };
  }

  if (!Array.isArray(codelists)) {
    return {
      ok: false,
      warnings,
      error: {
        code: "partial_payload",
        path: "$.codelists",
        message: "Codelists array is missing from the CDISC response bundle.",
      },
    };
  }

  if (!isRecord(termsByCodelistOid)) {
    return {
      ok: false,
      warnings,
      error: {
        code: "partial_payload",
        path: "$.termsByCodelistOid",
        message: "termsByCodelistOid map is missing from the CDISC response bundle.",
      },
    };
  }

  const packageOid = normalizePackageOid(pkg as CdiscCtPackage);
  if (!packageOid) {
    return {
      ok: false,
      warnings,
      error: {
        code: "invalid_field",
        path: "$.package",
        message: "Package OID could not be derived from package metadata.",
      },
    };
  }

  collectUnsupportedFields(pkg, PACKAGE_KEYS, "$.package", warnings);

  const packageTitle = asString(pkg.title) || asString(pkg.label) || packageOid;
  const codelistVersion = normalizePackageVersion(pkg as CdiscCtPackage, packageOid);
  const rows: CrfCodelistsRow[] = [];

  for (let index = 0; index < codelists.length; index += 1) {
    const codelist = codelists[index];
    if (!isRecord(codelist)) {
      return {
        ok: false,
        warnings,
        error: {
          code: "invalid_field",
          path: `$.codelists[${index}]`,
          message: "Each codelist entry must be an object.",
        },
      };
    }

    collectUnsupportedFields(codelist, CODELIST_KEYS, `$.codelists[${index}]`, warnings);

    const codelistOid = normalizeCodelistOid(codelist as CdiscCtCodelist);
    if (!codelistOid) {
      return {
        ok: false,
        warnings,
        error: {
          code: "invalid_field",
          path: `$.codelists[${index}]`,
          message: "Codelist OID could not be derived from codelist metadata.",
        },
      };
    }

    const termEntries = termsByCodelistOid[codelistOid];
    if (!Array.isArray(termEntries)) {
      return {
        ok: false,
        warnings,
        error: {
          code: "partial_payload",
          path: `$.termsByCodelistOid.${codelistOid}`,
          message: `Terms for codelist '${codelistOid}' are missing from the response bundle.`,
        },
      };
    }

    const codelistId =
      asString(codelist.submissionValue) || asString(codelist.title) || codelistOid;
    const codelistName = asString(codelist.title) || codelistId;

    for (let termIndex = 0; termIndex < termEntries.length; termIndex += 1) {
      const term = termEntries[termIndex];
      if (!isRecord(term)) {
        return {
          ok: false,
          warnings,
          error: {
            code: "invalid_field",
            path: `$.termsByCodelistOid.${codelistOid}[${termIndex}]`,
            message: "Each term entry must be an object.",
          },
        };
      }

      collectUnsupportedFields(
        term,
        TERM_KEYS,
        `$.termsByCodelistOid.${codelistOid}[${termIndex}]`,
        warnings
      );

      const termOid = normalizeTermOid(term as CdiscCtTerm);
      if (!termOid) {
        return {
          ok: false,
          warnings,
          error: {
            code: "invalid_field",
            path: `$.termsByCodelistOid.${codelistOid}[${termIndex}]`,
            message: "Term OID could not be derived from term metadata.",
          },
        };
      }

      const codedValue = asString(term.codedValue) || asString(term.submissionValue) || termOid;
      const decodeFromDecode = asString(term.decode);
      const decodeFromTitle = asString(term.title);
      if (decodeFromDecode && decodeFromTitle && decodeFromDecode !== decodeFromTitle) {
        warnings.push({
          code: "ambiguous_term_decode",
          path: `$.termsByCodelistOid.${codelistOid}[${termIndex}]`,
          message: `Term '${termOid}' includes both decode and title with different values; decode is preferred.`,
        });
      }
      const decode = decodeFromDecode || decodeFromTitle || codedValue;

      rows.push({
        codelistId,
        codelistName,
        codedValue,
        decode,
        codelistOid,
        termOid,
        codelistVersion,
        source,
        sourcePackageOid: packageOid,
        sourcePackageTitle: packageTitle,
      });
    }
  }

  return {
    ok: true,
    rows,
    warnings,
  };
}

export function applyCodelistLifecycle(
  existingRows: CrfCodelistsRow[],
  incomingRows: CrfCodelistsRow[]
): LifecycleResult {
  const warnings: MappingWarning[] = [];
  const decisions: LifecycleDecision[] = [];
  const rowsToUpsert: CrfCodelistsRow[] = [];

  const existingByKey = new Map<string, CrfCodelistsRow>();
  existingRows.forEach((row) => {
    existingByKey.set(`${row.codelistId}::${row.codedValue}`, row);
  });

  incomingRows.forEach((row) => {
    const key = `${row.codelistId}::${row.codedValue}`;
    const existing = existingByKey.get(key);

    if (!existing) {
      decisions.push({
        action: "insert",
        row,
        message: "No existing row found; insert incoming row.",
      });
      rowsToUpsert.push(row);
      return;
    }

    if (rowsEqual(existing, row)) {
      decisions.push({
        action: "skip_identical",
        row,
        message: "Existing row is identical to incoming row; skip.",
      });
      return;
    }

    const versionComparison = compareVersion(row.codelistVersion, existing.codelistVersion);
    if (versionComparison !== null && versionComparison > 0) {
      decisions.push({
        action: "overwrite",
        row,
        message: `Incoming version '${row.codelistVersion}' is newer than existing '${existing.codelistVersion}'.`,
      });
      rowsToUpsert.push(row);
      return;
    }

    const conflictMessage =
      versionComparison === null
        ? "Version conflict is ambiguous; user prompt required before overwrite."
        : `Incoming version '${row.codelistVersion}' is not newer than existing '${existing.codelistVersion}'; user prompt required.`;

    decisions.push({
      action: "prompt_user",
      row,
      message: conflictMessage,
    });
    warnings.push({
      code: "lifecycle_conflict_requires_user_prompt",
      path: key,
      message: conflictMessage,
    });
  });

  return {
    decisions,
    rowsToUpsert,
    warnings,
  };
}
