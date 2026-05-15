export type OfficeErrorClass =
  | "excelBusy"
  | "workbookNotReady"
  | "sheetOrRangeMissing"
  | "permissionFailure"
  | "contextSyncFailure"
  | "unsupportedHost"
  | "networkFailure"
  | "unknownOfficeError";

interface OfficeErrorMessageDefinition {
  message: string;
  recoveryAction: string;
  allowRetry: boolean;
  diagnosticCode: string;
}

export interface OfficeErrorPresentation {
  errorClass: OfficeErrorClass;
  message: string;
  recoveryAction: string;
  allowRetry: boolean;
  diagnosticCode: string;
}

export const OFFICE_ERROR_MESSAGES: Record<OfficeErrorClass, OfficeErrorMessageDefinition> = {
  excelBusy: {
    message: "Please finish editing the current cell and try again.",
    recoveryAction: "Press Enter or click another cell, then retry.",
    allowRetry: true,
    diagnosticCode: "OFFICE_EXCEL_BUSY",
  },
  workbookNotReady: {
    message: "Waiting for workbook to load...",
    recoveryAction: "Wait a few seconds and retry.",
    allowRetry: true,
    diagnosticCode: "OFFICE_WORKBOOK_NOT_READY",
  },
  sheetOrRangeMissing: {
    message: "A required sheet or range is missing. Please check workbook structure.",
    recoveryAction: "Confirm required sheets/ranges exist, then retry.",
    allowRetry: true,
    diagnosticCode: "OFFICE_SHEET_OR_RANGE_MISSING",
  },
  permissionFailure: {
    message: "This sheet is protected. Some operations may be unavailable.",
    recoveryAction: "Unprotect the sheet or ask for edit access, then retry.",
    allowRetry: true,
    diagnosticCode: "OFFICE_PERMISSION_PROTECTION",
  },
  contextSyncFailure: {
    message: "Excel could not complete the action right now.",
    recoveryAction: "Retry. If this continues, close and reopen the workbook.",
    allowRetry: true,
    diagnosticCode: "OFFICE_CONTEXT_SYNC_FAILURE",
  },
  unsupportedHost: {
    message: "This feature requires a newer supported version of Excel.",
    recoveryAction: "Open this workbook in a supported Excel host/version and retry.",
    allowRetry: false,
    diagnosticCode: "OFFICE_UNSUPPORTED_HOST",
  },
  networkFailure: {
    message: "Could not connect. Please check your internet connection.",
    recoveryAction: "Verify connectivity and retry.",
    allowRetry: true,
    diagnosticCode: "OFFICE_NETWORK_FAILURE",
  },
  unknownOfficeError: {
    message: "Something went wrong while communicating with Excel.",
    recoveryAction: "Dismiss and retry the action.",
    allowRetry: true,
    diagnosticCode: "OFFICE_UNKNOWN_ERROR",
  },
};

function normalizeOfficeError(error: unknown): { code: string; message: string } {
  const value = error as { code?: unknown; message?: unknown } | undefined;
  return {
    code: typeof value?.code === "string" ? value.code : "",
    message: typeof value?.message === "string" ? value.message : String(error ?? ""),
  };
}

function extractMissingResourceName(message: string): string | null {
  const singleQuoted = message.match(/'(.*?)'/);
  if (singleQuoted && singleQuoted[1]) {
    return singleQuoted[1];
  }
  const doubleQuoted = message.match(/"(.*?)"/);
  if (doubleQuoted && doubleQuoted[1]) {
    return doubleQuoted[1];
  }
  return null;
}

export function classifyOfficeError(error: unknown): OfficeErrorClass {
  const normalized = normalizeOfficeError(error);
  const combined = `${normalized.code} ${normalized.message}`.toLowerCase();

  if (
    combined.includes("busy") ||
    combined.includes("edit mode") ||
    combined.includes("in cell edit mode")
  ) {
    return "excelBusy";
  }

  if (
    combined.includes("workbook not ready") ||
    combined.includes("not ready") ||
    combined.includes("invalidobjectpath")
  ) {
    return "workbookNotReady";
  }

  if (
    combined.includes("itemnotfound") ||
    combined.includes("not found") ||
    combined.includes("worksheet") ||
    combined.includes("range")
  ) {
    return "sheetOrRangeMissing";
  }

  if (
    combined.includes("accessdenied") ||
    combined.includes("permission") ||
    combined.includes("protected") ||
    combined.includes("protection")
  ) {
    return "permissionFailure";
  }

  if (
    combined.includes("context.sync") ||
    combined.includes("requestaborted") ||
    combined.includes("generalexception")
  ) {
    return "contextSyncFailure";
  }

  if (
    combined.includes("unsupported") ||
    combined.includes("not supported") ||
    combined.includes("office.js is not fully loaded")
  ) {
    return "unsupportedHost";
  }

  if (
    combined.includes("network") ||
    combined.includes("failed to fetch") ||
    combined.includes("timeout") ||
    combined.includes("econn")
  ) {
    return "networkFailure";
  }

  return "unknownOfficeError";
}

export function createOfficeErrorPresentation(error: unknown): OfficeErrorPresentation {
  const normalized = normalizeOfficeError(error);
  const errorClass = classifyOfficeError(error);
  const baseMessage = OFFICE_ERROR_MESSAGES[errorClass];
  const missingName = extractMissingResourceName(normalized.message);

  const message =
    errorClass === "sheetOrRangeMissing" && missingName
      ? `Required sheet or range '${missingName}' is missing. Please check workbook structure.`
      : baseMessage.message;

  const diagnosticCode = normalized.code
    ? `${baseMessage.diagnosticCode}:${normalized.code}`
    : baseMessage.diagnosticCode;

  return {
    errorClass,
    message,
    recoveryAction: baseMessage.recoveryAction,
    allowRetry: baseMessage.allowRetry,
    diagnosticCode,
  };
}
