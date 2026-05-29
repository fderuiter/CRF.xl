/* eslint-disable no-undef */
import { StudyDesign, isCrfItem } from "../types";
import { ValidationIssue } from "../parser/validator";

export const RECOVERY_STORAGE_KEY = "crf-xl-recovery-snapshot-v1";
export const RECOVERY_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RECOVERY_APP_VERSION = "0.0.1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StudyDesignSummary {
  formCount: number;
  variableCount: number;
  visitCount: number;
}

export interface ValidationSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  analyzedAt: number;
}

export interface RecoveryIssue {
  level: ValidationIssue["level"];
  message: ValidationIssue["message"];
  location: ValidationIssue["location"];
  rowIndex?: ValidationIssue["rowIndex"];
  sheetName?: ValidationIssue["sheetName"];
}

export interface WorkbookFingerprint {
  sheetCount: number;
  sheetNames: string[];
}

export interface RecoverySnapshot {
  appVersion: string;
  savedAt: number;
  validationSummary: ValidationSummary;
  studySummary: StudyDesignSummary;
  uiState: {
    openForm?: string;
    currentFilter?: string;
  };
  issues: RecoveryIssue[];
  workbookFingerprint?: WorkbookFingerprint;
  justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
}

type PersistResult =
  | { saved: true }
  | { saved: false; reason: "storage-unavailable" | "quota-exceeded" | "unknown" };

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "QuotaExceededError"
  );
}

export function summarizeStudyDesign(study: StudyDesign): StudyDesignSummary {
  const forms = Object.values(study.forms ?? {});
  const variableCount = forms.reduce(
    (total, form) =>
      total +
      (form.itemGroups ?? []).reduce(
        (groupTotal, group) => groupTotal + (group.items?.filter(isCrfItem).length ?? 0),
        0
      ),
    0
  );
  return {
    formCount: forms.length,
    variableCount,
    visitCount: study.events?.length ?? 0,
  };
}

export function summarizeValidation(
  issues: ValidationIssue[],
  analyzedAt: number = Date.now()
): ValidationSummary {
  const errorCount = issues.filter((issue) => issue.level === "Error").length;
  return {
    totalIssues: issues.length,
    errorCount,
    warningCount: issues.length - errorCount,
    analyzedAt,
  };
}

export function toRecoveryIssues(issues: ValidationIssue[]): RecoveryIssue[] {
  return issues.map((issue) => ({
    level: issue.level,
    message: issue.message,
    location: issue.location,
    rowIndex: issue.rowIndex,
    sheetName: issue.sheetName,
  }));
}

export function createRecoverySnapshot({
  issues,
  studySummary,
  openForm,
  currentFilter,
  workbookFingerprint,
  justifications,
  analyzedAt = Date.now(),
  appVersion = RECOVERY_APP_VERSION,
}: {
  issues: ValidationIssue[];
  studySummary: StudyDesignSummary;
  openForm?: string;
  currentFilter?: string;
  workbookFingerprint?: WorkbookFingerprint;
  justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
  analyzedAt?: number;
  appVersion?: string;
}): RecoverySnapshot {
  return {
    appVersion,
    savedAt: Date.now(),
    validationSummary: summarizeValidation(issues, analyzedAt),
    studySummary,
    uiState: {
      openForm,
      currentFilter,
    },
    issues: toRecoveryIssues(issues),
    workbookFingerprint,
    justifications,
  };
}

export function persistRecoverySnapshot(
  snapshot: RecoverySnapshot,
  storage?: StorageLike
): PersistResult {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return { saved: false, reason: "storage-unavailable" };

  try {
    resolvedStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
    return { saved: true };
  } catch (error) {
    if (isQuotaError(error)) return { saved: false, reason: "quota-exceeded" };
    return { saved: false, reason: "unknown" };
  }
}

export function dismissRecoverySnapshot(storage?: StorageLike): void {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return;
  try {
    resolvedStorage.removeItem(RECOVERY_STORAGE_KEY);
  } catch {
    // no-op: storage cleanup failure should never crash UI
  }
}

export function readRecoverySnapshot({
  storage,
  now = Date.now(),
  ttlMs = RECOVERY_SNAPSHOT_TTL_MS,
}: {
  storage?: StorageLike;
  now?: number;
  ttlMs?: number;
} = {}): RecoverySnapshot | null {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return null;

  let raw: string | null = null;
  try {
    raw = resolvedStorage.getItem(RECOVERY_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecoverySnapshot;
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !parsed.validationSummary ||
      !parsed.studySummary ||
      !Array.isArray(parsed.issues)
    ) {
      dismissRecoverySnapshot(resolvedStorage);
      return null;
    }
    if (now - parsed.savedAt > ttlMs) {
      dismissRecoverySnapshot(resolvedStorage);
      return null;
    }
    return parsed;
  } catch {
    dismissRecoverySnapshot(resolvedStorage);
    return null;
  }
}

export function hasWorkbookChanged(
  snapshot?: WorkbookFingerprint,
  current?: WorkbookFingerprint
): boolean {
  if (!snapshot || !current) return false;
  if (snapshot.sheetCount !== current.sheetCount) return true;
  if (snapshot.sheetNames.length !== current.sheetNames.length) return true;
  return snapshot.sheetNames.some((name, index) => name !== current.sheetNames[index]);
}
