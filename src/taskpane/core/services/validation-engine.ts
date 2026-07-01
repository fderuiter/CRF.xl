/**
 * @issue #28
 */
import { StudyDesign } from "../types/index";
import { ValidationIssue } from "../types";
import { parseExcelToStudyDesign } from "../parser/excel-parser";

export interface ValidationState {
  isProcessing: boolean;
  study: StudyDesign | null;
  issues: ValidationIssue[];
  status: string;
}

type Subscriber = (state: ValidationState) => void;

class BackgroundValidationEngine {
  private state: ValidationState = {
    isProcessing: false,
    study: null,
    issues: [],
    status: "Ready",
  };
  private subscribers: Set<Subscriber> = new Set();
  private validationTimeout: number | null = null;
  private currentAbortController: AbortController | null = null;
  private latestSheetFilter: string | undefined = undefined;

  public subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((sub) => sub(this.state));
  }

  public getState() {
    return this.state;
  }

  public triggerValidation(sheetFilter?: string, delayMs = 500) {
    this.latestSheetFilter = sheetFilter;
    if (this.validationTimeout !== null) {
      window.clearTimeout(this.validationTimeout);
    }

    // Immediately mark as processing to indicate UI is stale
    this.updateState(() => ({
      isProcessing: true,
      status: "Validation pending...",
    }));

    this.validationTimeout = window.setTimeout(() => {
      this.runValidation(this.latestSheetFilter);
    }, delayMs);
  }

  public updateState(updater: (prev: ValidationState) => Partial<ValidationState>) {
    this.state = {
      ...this.state,
      ...updater(this.state),
    };
    this.notify();
  }

  private async runValidation(sheetFilter?: string) {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    const abortController = new AbortController();
    this.currentAbortController = abortController;
    const signal = abortController.signal;

    this.state = {
      ...this.state,
      isProcessing: true,
      status: "Analyzing workbook in background...",
    };
    this.notify();

    try {
      const result = await parseExcelToStudyDesign({
        chunkSize: 250,
        timeoutMs: 45000,
        signal,
        onProgress: (progress) => {
          if (signal.aborted) return;
          this.state = {
            ...this.state,
            status: `Analyzing: ${progress.message} (${progress.completed}/${progress.total})`,
          };
          this.notify();
        },
      });

      if (signal.aborted) return;

      const freshStudy = result.studyDesign;
      let validationIssues = result.validationIssues;

      if (sheetFilter && !sheetFilter.startsWith("_")) {
        validationIssues = validationIssues.filter((i) => i.sheetName === sheetFilter);
      }

      this.state = {
        isProcessing: false,
        study: freshStudy,
        issues: validationIssues,
        status: validationIssues.some((i) => i.level === "Error")
          ? "Issues detected"
          : "Specification clean",
      };
      this.notify();
    } catch (e) {
      if (signal.aborted) return;
      this.state = {
        ...this.state,
        isProcessing: false,
        status: "Analysis failed",
      };
      this.notify();
    }
  }
}

export const backgroundValidationEngine = new BackgroundValidationEngine();
