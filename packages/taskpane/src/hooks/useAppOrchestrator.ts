/**
 * @issue #349
 */
import { useState, useEffect } from "react";
import { appOrchestrator, OrchestratorState } from "@crf-xl/taskpane/services/app-orchestrator";

import { speculativeSyncManager } from "@crf-xl/taskpane/services/speculative-sync-service";

import { ValidationIssue } from "@crf-xl/core/types/validation";
import { SubmissionMetadata } from "@crf-xl/core/types/clinical";


let isOrchestratorInitialized = false;

export function useAppOrchestrator() {
  const [state, setState] = useState<OrchestratorState>({
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
  });

  useEffect(() => {
    if (!isOrchestratorInitialized) {
      appOrchestrator.initialize();
      isOrchestratorInitialized = true;
    }

    const unsubscribe = appOrchestrator.subscribe((newState) => {
      setState({ ...newState }); // Create new object to trigger React re-render
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const actions = {
    dismissRecoverySnapshot: () => appOrchestrator.dismissRecoverySnapshot(),
    restoreRecoverySnapshot: () => appOrchestrator.restoreRecoverySnapshot(),
    dismissUiError: () => appOrchestrator.dismissUiError(),
    updateJustifications: (j: any) => appOrchestrator.updateJustifications(j),
    resolveConflict: (keepManualEdits: boolean) =>
      speculativeSyncManager.resolveConflict(keepManualEdits),
    rollbackSync: () => speculativeSyncManager.rollback(),
    requestValidation: (activeSheet?: string) => appOrchestrator.requestValidation(activeSheet),
    injectValidationIssue: (issue: ValidationIssue) => appOrchestrator.injectValidationIssue(issue),
    clearValidationIssueByLocation: (location: string) =>
      appOrchestrator.clearValidationIssueByLocation(location),
    updateStudySubmissionMetadata: (metadata: SubmissionMetadata) =>
      appOrchestrator.updateStudySubmissionMetadata(metadata),
  };

  return { state, actions };
}
