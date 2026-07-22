/// <reference types="office-js" />
/**
 * @issue #349
 */
import { SubscriptionManager } from "../utils/event-utility";
import { backgroundValidationEngine } from "./validation-engine";
import { speculativeSyncManager, SyncState } from "./speculative-sync-service";
import { bindingService } from "./binding-service";
import {
  RecoverySnapshot,
  persistRecoverySnapshot,
  readRecoverySnapshot,
  hasWorkbookChanged,
  WorkbookFingerprint,
  dismissRecoverySnapshot,
  createRecoverySnapshot,
  summarizeStudyDesign,
} from "./recovery-storage";
import { StudyDesign, ValidationIssue, AuditJustification, SubmissionMetadata } from "../types";
import { logger } from "../utils/logger";

export interface OrchestratorState {
  isProcessing: boolean;
  study: StudyDesign | null;
  issues: ValidationIssue[];
  status: string;
  isSyncing: boolean;
  syncConflict: any | null;
  syncStatus: SyncState;
  recoverySnapshot: {
    snapshot: RecoverySnapshot;
    workbookChanged: boolean;
  } | null;
  storageWarning: string | null;
  activeSheet: string | null;
  isCodelistActive: boolean;
  uiError: any | null;
}

class AppOrchestrator {
  private state: OrchestratorState = {
    isProcessing: false,
    study: null,
    issues: [],
    status: "Ready",
    isSyncing: false,
    syncConflict: null,
    syncStatus: "idle",
    recoverySnapshot: null,
    storageWarning: null,
    activeSheet: null,
    isCodelistActive: false,
    uiError: null,
  };

  private subscriptionManager = new SubscriptionManager<OrchestratorState>();
  private pendingValidation: { activeSheet?: string; throttleMs: number } | null = null;
  private checkpointTimer: number | null = null;
  private dataChangedHandler: any = null;
  private justifications: Record<string, AuditJustification> = {};

  public initialize() {
    // Subscribe to Validation Engine
    backgroundValidationEngine.subscribe((valState) => {
      this.updateState({
        isProcessing: valState.isProcessing,
        study: valState.study,
        issues: valState.issues,
        status: valState.status,
      });
    });

    // Subscribe to Sync Manager
    speculativeSyncManager.subscribe(({ state: syncState, details }) => {
      let overrides: Partial<OrchestratorState> = { syncStatus: syncState };

      if (syncState === "syncing") {
        overrides.isSyncing = true;
        if (details?.predictedStudy) {
          backgroundValidationEngine.updateState(() => ({ study: details.predictedStudy }));
        }
      } else if (syncState === "conflict") {
        overrides.isSyncing = false;
        overrides.syncConflict = details;
      } else if (syncState === "idle") {
        overrides.isSyncing = false;
        if (details?.study) {
          backgroundValidationEngine.updateState(() => ({ study: details.study }));
        }
        if (this.pendingValidation) {
          backgroundValidationEngine.triggerValidation(
            this.pendingValidation.activeSheet,
            this.pendingValidation.throttleMs
          );
          this.pendingValidation = null;
        }
      } else if (syncState === "error") {
        overrides.isSyncing = false;
        overrides.uiError = {
          severity: "error",
          category: "SYNC_ERROR",
          message: "Background sync failed.",
          recoveryAction: "Check workbook and retry.",
          allowRetry: true,
        };
      }
      this.updateState(overrides);
    });

    // Subscribe to Binding Service Errors
    bindingService.subscribeError((diagnostic) => {
      this.updateState({ uiError: { ...diagnostic.toJSON() } });
    });

    // Sub to active sheet
    bindingService.initialize().catch(logger.error);
    bindingService.subscribe((context) => {
      const activeSheet = context.sheetName;
      const shouldShowSidecar =
        !activeSheet.startsWith("_") && context.columnIndex === 9 && context.isValid;

      this.updateState({
        activeSheet,
        isCodelistActive: shouldShowSidecar,
      });
      this.requestValidation(activeSheet, 1000);
    });

    // Telemetry Trigger for data changes
    if (typeof Excel !== "undefined") {
      Excel.run(async (context) => {
        this.dataChangedHandler = context.workbook.worksheets.onChanged.add(async () => {
          this.requestValidation(this.state.activeSheet || undefined, 1000);
        });
        await context.sync();
      }).catch(logger.error);
    }

    // Auto-Recovery Checkpointer
    this.checkpointTimer = window.setInterval(() => {
      this.saveCheckpoint();
    }, 30000);

    // Initial load recovery
    this.detectRecoverableSnapshot();
  }

  public terminate() {
    if (this.checkpointTimer) window.clearInterval(this.checkpointTimer);
    if (this.dataChangedHandler && typeof Excel !== "undefined") {
      this.dataChangedHandler.remove();
    }
    bindingService.terminate().catch(logger.error);
    this.subscriptionManager.clear();
  }

  public subscribe(callback: (state: OrchestratorState) => void) {
    callback(this.state);
    return this.subscriptionManager.subscribe(callback);
  }

  public updateState(updates: Partial<OrchestratorState>) {
    this.state = { ...this.state, ...updates };
    this.subscriptionManager.notify(this.state);
  }

  // Intercept trigger to queue if Excel is busy syncing
  public requestValidation(activeSheet?: string, throttleMs = 1000) {
    if (this.state.isSyncing) {
      this.pendingValidation = { activeSheet, throttleMs };
      return;
    }
    backgroundValidationEngine.triggerValidation(activeSheet, throttleMs);
  }

  public updateJustifications(justifications: Record<string, AuditJustification>) {
    this.justifications = justifications;
  }

  public injectValidationIssue(issue: ValidationIssue) {
    backgroundValidationEngine.updateState((prev) => {
      if (!prev.issues.some((i) => i.location === issue.location && i.message === issue.message)) {
        return { issues: [...prev.issues, issue], status: "Issues detected" };
      }
      return {};
    });
  }

  public clearValidationIssueByLocation(location: string) {
    backgroundValidationEngine.updateState((prev) => {
      if (prev.issues.some((i) => i.location === location)) {
        const filtered = prev.issues.filter((i) => i.location !== location);
        return { issues: filtered, status: filtered.length === 0 ? "Ready" : "Issues detected" };
      }
      return {};
    });
  }

  public updateStudySubmissionMetadata(metadata: SubmissionMetadata) {
    backgroundValidationEngine.updateState((prev) => ({
      study: prev.study ? { ...prev.study, submissionMetadata: metadata } : prev.study,
    }));
  }

  private async saveCheckpoint() {
    if (!this.state.study || this.state.isSyncing) return; // Don't snapshot if we don't have a stable state
    const studySummary = summarizeStudyDesign(this.state.study);
    const activeSheet = this.state.activeSheet;
    const openForm = activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined;

    const snapshot = createRecoverySnapshot({
      issues: this.state.issues,
      studySummary,
      openForm,
      currentFilter: openForm,
      workbookFingerprint: undefined, // Fingerprints dynamically measured on load
      justifications: this.justifications,
    });

    const saveResult = await persistRecoverySnapshot(snapshot);
    if ("reason" in saveResult && saveResult.reason === "quota-exceeded") {
      this.updateState({
        storageWarning: "Recovery checkpoint could not be saved (localStorage quota exceeded).",
      });
    } else if (saveResult.saved) {
      this.updateState({ storageWarning: null });
    }
  }

  private async detectRecoverableSnapshot() {
    const snapshot = await readRecoverySnapshot();
    if (!snapshot) return;

    let currentFingerprint: WorkbookFingerprint | undefined = undefined;
    if (typeof Excel !== "undefined") {
      try {
        currentFingerprint = await Excel.run(async (context) => {
          const sheets = context.workbook.worksheets;
          sheets.load("items/name");
          await context.sync();
          const sheetNames = sheets.items.map((sheet) => sheet.name).sort();
          return { sheetCount: sheetNames.length, sheetNames };
        });
      } catch {
        currentFingerprint = undefined;
      }
    }

    this.updateState({
      recoverySnapshot: {
        snapshot,
        workbookChanged: hasWorkbookChanged(snapshot.workbookFingerprint, currentFingerprint),
      },
    });
  }

  // --- External Actions ---
  public async dismissRecoverySnapshot() {
    await dismissRecoverySnapshot();
    this.updateState({ recoverySnapshot: null });
  }

  public restoreRecoverySnapshot() {
    const rec = this.state.recoverySnapshot;
    if (!rec) return;
    backgroundValidationEngine.updateState(() => ({
      issues: rec.snapshot.issues as ValidationIssue[],
    }));
    this.updateState({ recoverySnapshot: null });
    return rec.snapshot;
  }

  public dismissUiError() {
    this.updateState({ uiError: null });
  }
}

export const appOrchestrator = new AppOrchestrator();
if (typeof window !== "undefined") {
  (window as any).appOrchestrator = appOrchestrator;
}
