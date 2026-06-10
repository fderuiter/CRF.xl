/**
 * @issue #68
 */
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

/**
 * Reads and validates a persisted recovery snapshot from storage.
 *
 * Attempts to load, parse, and validate the snapshot stored under the recovery key.
 * Invalid, corrupt, or expired snapshots are removed from storage before returning.
 *
 * @param now - Current timestamp in milliseconds used to evaluate snapshot age (defaults to Date.now()).
 * @param ttlMs - Maximum allowed age for a snapshot in milliseconds; snapshots older than this are treated as expired.
 * @returns The parsed `RecoverySnapshot` if present, structurally valid, and not expired; `null` otherwise.
 */
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

/**
 * Determine whether two workbook fingerprints indicate the workbook's worksheets have changed.
 *
 * If either fingerprint is missing, no change is reported.
 *
 * @param snapshot - Previously saved workbook fingerprint (may be `undefined`).
 * @param current - Current workbook fingerprint (may be `undefined`).
 * @returns `true` if the fingerprints differ by sheet count or by any sheet name at the same index, `false` otherwise.
 */
export function hasWorkbookChanged(
  snapshot?: WorkbookFingerprint,
  current?: WorkbookFingerprint
): boolean {
  if (!snapshot || !current) return false;
  if (snapshot.sheetCount !== current.sheetCount) return true;
  if (snapshot.sheetNames.length !== current.sheetNames.length) return true;
  return snapshot.sheetNames.some((name, index) => name !== current.sheetNames[index]);
}

/**
 * Produce a workbook fingerprint containing the worksheet count and sorted worksheet names.
 *
 * @returns A `WorkbookFingerprint` object with `sheetCount` and `sheetNames`, or `undefined` if the Excel API is unavailable or fingerprint generation fails.
 */
export async function generateWorkbookFingerprint(): Promise<WorkbookFingerprint | undefined> {
  if (typeof Excel === "undefined") return undefined;
  try {
    return await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      const sheetNames = sheets.items.map((sheet) => sheet.name).sort();
      return { sheetCount: sheetNames.length, sheetNames };
    });
  } catch {
    return undefined;
  }
}

/**
 * Checks for a valid persisted recovery snapshot and indicates whether the current workbook differs from it.
 *
 * If no valid snapshot is found or storage is unavailable, this function returns `null`.
 *
 * @returns An object containing the persisted `snapshot` and `workbookChanged` — `true` if the current workbook fingerprint differs from the snapshot's fingerprint, `false` if it matches — or `null` when no valid snapshot exists.
 */
export async function detectRecoverableSnapshot(): Promise<{ snapshot: RecoverySnapshot; workbookChanged: boolean } | null> {
  const snapshot = readRecoverySnapshot();
  if (!snapshot) return null;

  const currentFingerprint = await generateWorkbookFingerprint();

  // If currentFingerprint is undefined (transient Excel/API failure), mark as unsafe for recovery
  const workbookChanged = currentFingerprint === undefined
    ? true
    : hasWorkbookChanged(snapshot.workbookFingerprint, currentFingerprint);

  return {
    snapshot,
    workbookChanged,
  };
}

/**
 * Periodically persist recovery checkpoints using parameters supplied by a callback.
 *
 * @param paramsProvider - Returns checkpoint parameters:
 *   - `issues`: validation issues to include in the snapshot
 *   - `studySummary`: summary of the study design; if `null` no snapshot is created
 *   - `activeSheet` (optional): current active sheet name; if present and does not start with `_` it is used to set the snapshot `uiState.openForm`
 *   - `currentFilter` (optional): current UI filter to store in the snapshot
 *   - `workbookFingerprint` (optional): current workbook fingerprint to store with the snapshot
 *   - `justifications` (optional): map of justification metadata to include in the snapshot
 * @param onWarning - Callback invoked with a warning message when a checkpoint cannot be saved, or `null` to clear any previous warning.
 * @param intervalMs - Interval in milliseconds between checkpoint saves (default: 30000).
 * @returns A function that stops the periodic checkpoint sync when called.
 */
export function startCheckpointSync(
  paramsProvider: () => {
    issues: ValidationIssue[];
    studySummary: StudyDesignSummary | null;
    activeSheet?: string;
    currentFilter?: string | null;
    workbookFingerprint?: WorkbookFingerprint;
    justifications?: Record<string, { reason: string; userId: string; timestamp: string }>;
  },
  onWarning: (msg: string | null) => void,
  intervalMs: number = 30000
): () => void {
  const saveCheckpoint = () => {
    const params = paramsProvider();
    if (!params.studySummary) return;

    const openForm = params.activeSheet && !params.activeSheet.startsWith("_") ? params.activeSheet : undefined;
    const snapshot = createRecoverySnapshot({
      issues: params.issues,
      studySummary: params.studySummary,
      openForm,
      currentFilter: params.currentFilter ?? undefined,
      workbookFingerprint: params.workbookFingerprint,
      justifications: params.justifications,
    });
    const saveResult = persistRecoverySnapshot(snapshot);
    if (saveResult.saved) {
      onWarning(null);
    } else if ("reason" in saveResult) {
      const reason = saveResult.reason === "quota-exceeded"
        ? "localStorage quota exceeded"
        : saveResult.reason === "storage-unavailable"
        ? "storage unavailable"
        : "unknown error";
      onWarning(`Recovery checkpoint could not be saved (${reason}).`);
    }
  };

  const timer = setInterval(saveCheckpoint, intervalMs);
  return () => clearInterval(timer);
}
