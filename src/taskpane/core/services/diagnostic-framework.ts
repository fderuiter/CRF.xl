/**
 * Shared diagnostic framework for error handling, design-time validation, and data ingestion.
 * Resolves fragmented error models by providing a single interface for all diagnostic messaging.
 *
 * @issue #76
 */

export type DiagnosticSeverity = "error" | "warning" | "info";

/**
 * Unified diagnostic record used across all services and import flows.
 */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Source-specific category or diagnostic code (e.g. "Parse", "OFFICE_EXCEL_BUSY"). */
  category: string;
  message: string;
  /** Sheet, field, or element location string (optional). */
  location?: string;
  /** Optional recovery action description. */
  recoveryAction?: string;
  /** Optional flag indicating if the operation can be retried. */
  allowRetry?: boolean;
}

/**
 * Standard error class that natively supports structured diagnostic metadata.
 * Designed to be safely serialised across worker thread boundaries.
 */
export class DiagnosticError extends Error implements Diagnostic {
  public severity: DiagnosticSeverity;
  public category: string;
  public location?: string;
  public recoveryAction?: string;
  public allowRetry?: boolean;

  constructor(diagnostic: Diagnostic) {
    super(diagnostic.message);
    this.name = "DiagnosticError";
    this.severity = diagnostic.severity;
    this.category = diagnostic.category;
    this.location = diagnostic.location;
    this.recoveryAction = diagnostic.recoveryAction;
    this.allowRetry = diagnostic.allowRetry;
  }

  /**
   * Prepares the error for postMessage transfer.
   * @returns
   */
  toJSON(): Diagnostic & { name: string } {
    return {
      name: this.name,
      severity: this.severity,
      category: this.category,
      message: this.message,
      location: this.location,
      recoveryAction: this.recoveryAction,
      allowRetry: this.allowRetry,
    };
  }

  /**
   * Reconstructs a DiagnosticError from a serialised payload.
   * @param data
   * @returns
   */
  static fromJSON(data: any): DiagnosticError {
    return new DiagnosticError({
      severity: data.severity ?? "error",
      category: data.category ?? "UNKNOWN_ERROR",
      message: data.message ?? String(data),
      location: data.location,
      recoveryAction: data.recoveryAction,
      allowRetry: data.allowRetry,
    });
  }
}
