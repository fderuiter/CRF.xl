import { DataOrigin } from "../types";

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
