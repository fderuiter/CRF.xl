/**
 * @issue #28
 */
import { DataOrigin, DataType } from "../types";

export const DATA_ORIGIN_OPTIONS = Object.values(DataOrigin);

const LEGACY_DATA_ORIGIN_MAP: Record<string, DataOrigin> = {
  collected: DataOrigin.COLLECTED,
  investigator: DataOrigin.COLLECTED,
  subject: DataOrigin.COLLECTED,
  derived: DataOrigin.DERIVED,
  assigned: DataOrigin.ASSIGNED,
  protocol: DataOrigin.PRE_SPECIFIED,
  "pre-specified": DataOrigin.PRE_SPECIFIED,
  prespecified: DataOrigin.PRE_SPECIFIED,
  "pre specified": DataOrigin.PRE_SPECIFIED,
  external: DataOrigin.EXTERNAL,
  edt: DataOrigin.EXTERNAL,
  other: DataOrigin.OTHER,
};

export function normalizeDataOrigin(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return undefined;
  }

  return LEGACY_DATA_ORIGIN_MAP[trimmedValue.toLowerCase()] ?? trimmedValue;
}

export function parseReferencedVariables(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const referencedVariables = String(value)
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return referencedVariables.length > 0 ? referencedVariables : undefined;
}

export function normalizeOid(oid: unknown): string {
  if (typeof oid !== "string") {
    return String(oid || "").trim();
  }
  const trimmed = oid.trim();
  // Strip namespace prefixes (e.g., "CDISC:") and version prefixes (e.g., "MV.")
  return trimmed.replace(/^([^:]+:|MV\.)/i, "").trim();
}

export function compareOids(oid1: unknown, oid2: unknown): boolean {
  return normalizeOid(oid1).toLowerCase() === normalizeOid(oid2).toLowerCase();
}

export function normalizeDataType(value: unknown): DataType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "integer":
    case "int":
    case "numeric":
      return DataType.INTEGER;
    case "float":
    case "decimal":
    case "double":
      return DataType.FLOAT;
    case "date":
      return DataType.DATE;
    case "time":
      return DataType.TIME;
    case "datetime":
      return DataType.DATETIME;
    case "boolean":
    case "bool":
      return DataType.BOOLEAN;
    case "codelist":
    case "lookup":
    case "choices":
      return DataType.CODELIST;
    default:
      return DataType.TEXT;
  }
}
