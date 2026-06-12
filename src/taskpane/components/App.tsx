/**
 * @issue #28
 */
import {
  applyValidationVisuals,
  getOrphanedAnnotationsCount,
} from "../core/services/annotation-service";
import { createParseRuntime } from "../core/parser/chunking-runtime";
import * as React from "react";
import * as CryptoJS from "crypto-js";
import { useState, useEffect, useRef } from "react";
import { speculativeSyncManager } from "../core/services/speculative-sync-service";

import {
  makeStyles,
  tokens,
  Spinner,
  Badge,
  Text,
  Button,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
} from "@fluentui/react-components";

// Core Logic
import { ValidationLog } from "./ValidationLog";
import { ValidationIssue, validateStudyDesign } from "../core/parser/validator";
import { parseExcelToStudyDesign } from "../core/parser/excel-parser";
import { complianceGovernanceService } from "../core/services/compliance-governance-service";
import { ComplianceExportService } from "../core/services/compliance-export-service";
import { VaultService } from "../core/services/vault-service";
import { backgroundValidationEngine } from "../core/services/validation-engine";

import { diffStudyDesigns } from "../core/services/diff-engine";
import {
  initializeWorkbook,
  navigateToSource,
  syncRegistry,
} from "../core/parser/template-generator";
import { StudyDesign, SubmissionMetadata } from "../core/types/index";
import {
  BaselineWorkbookParseError,
  parseBaselineWorkbookFile,
} from "../core/services/baseline-workbook-service";
import {
  RecoverySnapshot,
  RECOVERY_APP_VERSION,
  WorkbookFingerprint,
  createRecoverySnapshot,
  dismissRecoverySnapshot,
  hasWorkbookChanged,
  persistRecoverySnapshot,
  readRecoverySnapshot,
  summarizeStudyDesign,
} from "../core/services/recovery-storage";
import {
  createOfficeErrorPresentation,
  OfficeErrorPresentation,
} from "../core/services/office-error-handling";
import {
  checkForVersionUpdate,
  dismissVersionNotification,
  VersionUpdateMetadata,
} from "../core/services/version-update-service";
import { loadImportManifest } from "../core/services/migration-pipeline";

// Telemetry & Views
import { useExcelTelemetry } from "./views/useExcelTelemetry";
import { RegistryView } from "./views/RegistryView";
import { ComplianceGovernanceView } from "./views/ComplianceGovernanceView";
import { TabList, Tab } from "@fluentui/react-components";
import { MatrixView } from "./views/MatrixView";
import { AuthoringView } from "./views/AuthoringView";
import { IntegrityHubView } from "./views/IntegrityHubView";
import { DictionarySidecar } from "./views/DictionarySidecar";
import { AuditOrchestratorModal, AuditJustification } from "./AuditOrchestratorModal";

const useAppStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: "hidden",
  },
  header: {
    padding: "12px 16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    boxShadow: tokens.shadow2,
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoBox: {
    width: "32px",
    height: "32px",
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase300,
    boxShadow: tokens.shadow4,
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
  },
  appTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
    lineHeight: "1",
    letterSpacing: "-0.5px",
  },
  sheetLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginTop: "2px",
  },
  main: {
    position: "relative",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    padding: "16px",
    gap: "12px",
    overflowY: "auto",
    overflowX: "hidden",
  },
  scanningText: {
    textAlign: "center",
    padding: "32px 0",
    color: tokens.colorNeutralForeground3,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  syncText: {
    textAlign: "center",
    padding: "16px 0",
    color: tokens.colorNeutralForeground3,
  },
  welcomeCard: {
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusXLarge,
    padding: "24px",
    color: tokens.colorNeutralForegroundOnBrand,
    boxShadow: tokens.shadow8,
    position: "relative",
    overflow: "hidden",
  },
  welcomeTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    marginBottom: "8px",
    color: tokens.colorNeutralForegroundOnBrand,
  },
  welcomeDesc: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForegroundOnBrand,
    marginBottom: "20px",
    lineHeight: "1.5",
    opacity: 0.9,
  },
  initButton: {
    width: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightBold,
  },
  recoveryActions: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
});

function toSafeHttpUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export const App: React.FC<{ title?: string }> = () => {
  const styles = useAppStyles();
  const isMountedRef = useRef(true);
  // 1. Telemetry & Initialization State
  const { activeSheet, isCodelistActive, telemetryTrigger } = useExcelTelemetry();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // 2. Application State
  const [validationState, setValidationState] = useState(backgroundValidationEngine.getState());
  const study = validationState.study;
  const issues = validationState.issues;

  const [appIsProcessing, setAppIsProcessing] = useState(false);
  const [appStatus, setAppStatus] = useState("Ready");
  const [annotationProgress, setAnnotationProgress] = useState<string | null>(null);

  const isProcessing = validationState.isProcessing || appIsProcessing;
  const status = validationState.isProcessing ? validationState.status : appStatus;
  const displayStatus = annotationProgress || status;

  const lastVisualsRef = useRef<{ study: any, activeSheet: string | null } | null>(null);

  useEffect(() => {
    if (isInitialized) {
      backgroundValidationEngine.triggerValidation(
        activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined,
        1000 // Throttle
      );
    }
  }, [telemetryTrigger, isInitialized, activeSheet]);

  useEffect(() => {
    return backgroundValidationEngine.subscribe(setValidationState);
  }, []);

  useEffect(() => {
    if (study && !isProcessing) {
      // 1. Visual Validation
      if (
        !lastVisualsRef.current ||
        lastVisualsRef.current.study !== study ||
        lastVisualsRef.current.activeSheet !== activeSheet
      ) {
        lastVisualsRef.current = { study, activeSheet };
        const sheetsToClear = activeSheet && !activeSheet.startsWith("_") 
          ? [activeSheet] 
          : ["_Schedule", ...Object.keys(study.forms)];
        
        const runtime = createParseRuntime({
          onProgress: (update) => {
            const percent = Math.round((update.completed / update.total) * 100);
            setAnnotationProgress(`Annotations: ${update.message} (${percent}%)`);
          }
        });
        
        applyValidationVisuals(sheetsToClear, issues, runtime)
          .catch(console.error)
          .finally(() => setAnnotationProgress(null));
      }

      // 2. Summary
      setStudySummary(summarizeStudyDesign(study));
      setCurrentFilter(activeSheet && !activeSheet.startsWith("_") ? activeSheet : null);

      // 3. Vault Sync
      const vaultService = new VaultService();
      vaultService.syncValidationResults(
        study.metadata.protocolId || "UNKNOWN",
        study.metadata.version || "1.0",
        issues,
        CryptoJS.SHA256(JSON.stringify(study)).toString(CryptoJS.enc.Hex)
      ).catch(console.error);

      // 4. Environment Compliance
      if (!complianceGovernanceService.isAuthenticated) {
        complianceGovernanceService.initialize().catch(console.error);
      }
      Office.context.document.getFilePropertiesAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          const documentUrl = result.value.url || "local://document";
          complianceGovernanceService.getEnvironmentStatus(documentUrl).then(envStatus => {
            if (!envStatus.isCompliant) {
              const issue: ValidationIssue = {
                level: "Error",
                message: envStatus.isCloudHosted
                  ? "SharePoint location is not configured for GxP version history."
                  : "Workbook is saved locally. Move to a SharePoint location to meet audit trail requirements.",
                location: "Host Environment",
              };
              // Add if not already present
              if (!issues.some(i => i.location === issue.location && i.message === issue.message)) {
                backgroundValidationEngine.updateState((prev) => ({
                  issues: [...prev.issues, issue],
                  status: "Issues detected"
                }));
              }
            }
          }).catch(console.error);
        }
      });
    }
  }, [study, issues, isProcessing, activeSheet]);

  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [syncConflict, setSyncConflict] = useState<any>(null);
  const [baselineStudy, setBaselineStudy] = useState<StudyDesign | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [studySummary, setStudySummary] = useState<{
    formCount: number;
    variableCount: number;
    visitCount: number;
  } | null>(null);
  const [currentFilter, setCurrentFilter] = useState<string | null>(null);
  const [workbookFingerprint, setWorkbookFingerprint] = useState<WorkbookFingerprint | undefined>(
    undefined
  );
  const [recoverySnapshot, setRecoverySnapshot] = useState<{
    snapshot: RecoverySnapshot;
    workbookChanged: boolean;
  } | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [versionUpdate, setVersionUpdate] = useState<VersionUpdateMetadata | null>(null);
  const safeChangelogUrl = toSafeHttpUrl(versionUpdate?.changelogUrl);
  const [justifications, setJustifications] = useState<Record<string, AuditJustification>>({});
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [uiError, setUiError] = useState<
    (OfficeErrorPresentation & { retryAction?: () => Promise<void> }) | null
  >(null);
  const [activeTab, setActiveTab] = useState("design");
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [signOffTimestamp, setSignOffTimestamp] = useState<string | null>(null);

  // Revert sign-off if study changes
  useEffect(() => {
    if (isSignedOff) {
      setIsSignedOff(false);
      setSignOffTimestamp(null);
    }
  }, [study, issues]);

  const dismissUiError = () => setUiError(null);

  const presentOfficeError = (error: unknown, retryAction?: () => Promise<void>) => {
    const presentation = createOfficeErrorPresentation(error);
    console.error(`[${presentation.diagnosticCode}]`, error);
    setUiError({
      ...presentation,
      retryAction: presentation.allowRetry ? retryAction : undefined,
    });
  };

  const runWithOfficeErrorHandling = async <T,>(
    operation: () => Promise<T>,
    retryAction?: () => Promise<void>
  ): Promise<T | null> => {
    dismissUiError();
    try {
      return await operation();
    } catch (error) {
      const presentation = createOfficeErrorPresentation(error);

      if (presentation.errorClass === "contextSyncFailure") {
        try {
          return await operation();
        } catch (retryError) {
          presentOfficeError(retryError, retryAction);
          return null;
        }
      }

      presentOfficeError(error, retryAction);
      return null;
    }
  };

  useEffect(() => {
    return speculativeSyncManager.subscribe((state, details) => {
      if (state === "syncing") {
        setIsBackgroundSyncing(true);
        if (details?.predictedStudy) {
          backgroundValidationEngine.updateState(() => ({ study: details.predictedStudy }));
        }
      } else if (state === "conflict") {
        setIsBackgroundSyncing(false);
        setSyncConflict(details);
      } else if (state === "idle") {
        setIsBackgroundSyncing(false);
        if (details?.study) {
          backgroundValidationEngine.updateState(() => ({ study: details.study })); // rollback case
        }
      } else if (state === "error") {
        setIsBackgroundSyncing(false);
        setUiError({
          errorClass: "unknownOfficeError",
          message: "Background sync failed.",
          recoveryAction: "Check workbook and retry.",
          allowRetry: true,
          diagnosticCode: "SYNC_ERROR",
        });
      }
    });
  }, []);

  // Startup Check: Does the Matrix architecture exist yet?
  useEffect(() => {
    const checkInit = async () => {
      const result = await runWithOfficeErrorHandling(
        async () => {
          await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItemOrNullObject("_Study");
            await context.sync();
            setIsInitialized(!sheet.isNullObject);
          });
          return true;
        },
        async () => {
          await checkInit();
        }
      );
      if (!result) {
        setIsInitialized(false);
      }
    };
    checkInit();
  }, []);

  useEffect(() => {
    const detectRecoverableSnapshot = async () => {
      const snapshot = readRecoverySnapshot();
      if (!snapshot) return;

      let currentFingerprint: WorkbookFingerprint | undefined = undefined;
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

      setRecoverySnapshot({
        snapshot,
        workbookChanged: hasWorkbookChanged(snapshot.workbookFingerprint, currentFingerprint),
      });
    };

    void detectRecoverableSnapshot();
  }, []);

  useEffect(() => {
    const detectVersionUpdate = async () => {
      const globalRef = globalThis as { CRF_XL_VERSION_ENDPOINT?: string };
      const versionEndpoint = globalRef.CRF_XL_VERSION_ENDPOINT;
      const result = await checkForVersionUpdate({
        currentVersion: RECOVERY_APP_VERSION,
        endpoint: versionEndpoint,
      });
      if (!isMountedRef.current) return;
      if (result.status === "update-available") {
        setVersionUpdate(result.update);
      }
    };

    void detectVersionUpdate();
  }, []);

  useEffect(() => {
    if (!studySummary) return undefined;

    const saveCheckpoint = () => {
      const openForm = activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined;
      const snapshot = createRecoverySnapshot({
        issues,
        studySummary,
        openForm,
        currentFilter: currentFilter ?? undefined,
        workbookFingerprint,
        justifications,
      });
      const saveResult = persistRecoverySnapshot(snapshot);
      if ("reason" in saveResult && saveResult.reason === "quota-exceeded") {
        setStorageWarning("Recovery checkpoint could not be saved (localStorage quota exceeded).");
      } else if (saveResult.saved) {
        setStorageWarning(null);
      }
    };

    const checkpointTimer = window.setInterval(saveCheckpoint, 30000);
    return () => window.clearInterval(checkpointTimer);
  }, [studySummary, issues, activeSheet, currentFilter, workbookFingerprint]);

  const handleRestoreSnapshot = () => {
    if (!recoverySnapshot) return;
    backgroundValidationEngine.updateState(() => ({ issues: recoverySnapshot.snapshot.issues as ValidationIssue[] }));
    setStudySummary(recoverySnapshot.snapshot.studySummary);
    setCurrentFilter(recoverySnapshot.snapshot.uiState.currentFilter ?? null);
    if (recoverySnapshot.snapshot.justifications) {
      handleSaveJustifications(recoverySnapshot.snapshot.justifications);
    }
    setAppStatus(
      `Recovered snapshot from ${new Date(recoverySnapshot.snapshot.savedAt).toLocaleString()}`
    );
    setRecoverySnapshot(null);
  };

  const handleDismissSnapshot = () => {
    dismissRecoverySnapshot();
    setRecoverySnapshot(null);
  };

  const handleDismissVersionUpdate = () => {
    if (!versionUpdate) return;
    dismissVersionNotification(versionUpdate.version);
    setVersionUpdate(null);
  };

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      presentOfficeError(event.reason);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
  // --- Action Handlers ---
  const handleInitialize = async () => {
    setAppIsProcessing(true);
    setAppStatus("Scaffolding canvas...");
    try {
      const completed = await runWithOfficeErrorHandling(
        async () => {
          await initializeWorkbook();
          return true;
        },
        async () => {
          await handleInitialize();
        }
      );
      if (!completed) return;
      setIsInitialized(true); // Manually set to true once built
      setAppStatus("Canvas initialized");
    } catch (e) {
      setAppStatus("Init failed");
    } finally {
      setAppIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setAppIsProcessing(true);
    setAppStatus("Warping sheets...");
    try {
      const completed = await runWithOfficeErrorHandling(
        async () => {
          await syncRegistry();
          return true;
        },
        async () => {
          await handleSync();
        }
      );
      if (!completed) return;
      setAppStatus("Sheets synchronized");
    } catch (e) {
      setAppStatus("Sync failed");
    } finally {
      setAppIsProcessing(false);
    }
  };

  const studyDiffReport = React.useMemo(() => {
    if (!baselineStudy || !study) return null;
    const baseReport = diffStudyDesigns(baselineStudy, study);
    return {
      ...baseReport,
      items: baseReport.items.map((item) => {
        const key = `${item.formOid}::${item.itemOid}`;
        if (justifications[key]) {
          return { ...item, justification: justifications[key] };
        }
        return item;
      }),
    };
  }, [baselineStudy, study, justifications]);

  const hasMissingJustifications = React.useMemo(() => {
    if (!studyDiffReport) return false;
    return studyDiffReport.items.some((item) => {
      if (item.operation === "unchanged") return false;
      const requiresReason =
        item.current?.requireChangeReason || item.baseline?.requireChangeReason;
      if (requiresReason) {
        return !item.justification?.reason.trim();
      }
      return false;
    });
  }, [studyDiffReport]);

  const handleSaveJustifications = async (newJustifs: Record<string, AuditJustification>) => {
    setJustifications(newJustifs);
    try {
      await complianceGovernanceService.saveJustificationsToWorkbook(newJustifs);
      
      Office.context.document.getFilePropertiesAsync((result) => {
        let documentUrl = "local://document";
        if (result.status === Office.AsyncResultStatus.Succeeded && result.value.url) {
          documentUrl = result.value.url;
        }

        if (complianceGovernanceService.isAuthenticated) {
          complianceGovernanceService.syncSharePointMetadata(documentUrl, newJustifs);
        } else {
           complianceGovernanceService.initialize().then(() => {
              if (complianceGovernanceService.isAuthenticated) {
                 complianceGovernanceService.syncSharePointMetadata(documentUrl, newJustifs);
              }
           }).catch(() => {});
        }
      });
    } catch (e) {
      console.warn("Failed to persist/sync justifications", e);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      complianceGovernanceService.loadJustificationsFromWorkbook().then(loaded => {
        if (Object.keys(loaded).length > 0) {
          setJustifications(prev => ({ ...prev, ...loaded }));
        }
      }).catch(console.warn);
    }
  }, [isInitialized]);

  // We need an effect to pop the modal after diffing is computed (since performAnalysis updates study, which triggers studyDiffReport update).
  React.useEffect(() => {
    if (studyDiffReport && hasMissingJustifications) {
      setShowAuditModal(true);
    }
  }, [studyDiffReport, hasMissingJustifications]);

  const handleComplianceExport = async () => {
    // Check environment compliance first
    let envStatus;
    try {
      if (!complianceGovernanceService.isAuthenticated) {
        await complianceGovernanceService.initialize();
      }
      const documentUrl = await new Promise<string>((resolve, reject) => {
        Office.context.document.getFilePropertiesAsync((result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result.value.url || "local://document");
          } else {
            reject(new Error("Failed to get document URL"));
          }
        });
      });
      envStatus = await complianceGovernanceService.getEnvironmentStatus(documentUrl);
    } catch (e) {
      console.warn("Failed to fetch environment status", e);
    }

    if (!envStatus || !envStatus.isCompliant) {
      setUiError({
        errorClass: "unknownOfficeError",
        message: "Environment is not compliant.",
        recoveryAction:
          "Open the Compliance tab to view and remediate environment issues before exporting.",
        allowRetry: false,
        diagnosticCode: "ENV_NONCOMPLIANT",
      });
      setActiveTab("compliance");
      return;
    }

    const s = study;
    if (isProcessing) {
      setUiError({
        errorClass: "unknownOfficeError",
        message: "Analysis is currently running in the background.",
        recoveryAction: "Please wait a moment and try again.",
        allowRetry: false,
        diagnosticCode: "ANALYSIS_IN_PROGRESS",
      });
      return;
    }
    if (!s || issues.some((i) => i.level === "Error")) return;

    // Check for orphaned annotations
    const sheets = ["_Study", "_Schedule", "_Codelists", "_Dictionaries", "_Rules"];
    Object.keys(s.forms).forEach((f) => sheets.push(f));
    const count = await getOrphanedAnnotationsCount(sheets);
    if (count > 0) {
      setOrphanedCount(count);
      setShowGate(true);
    } else {
      await confirmComplianceExport(s);
    }
  };

  const confirmComplianceExport = async (currentStudy: StudyDesign) => {
    setShowGate(false);
    setAppIsProcessing(true);
    try {
      const manifest = loadImportManifest();
      const zipBlob = await ComplianceExportService.createExportPackage(
        currentStudy,
        baselineStudy,
        issues,
        {
          signedOffAt: signOffTimestamp,
          source_provenance: manifest?.provenance,
          justifications: justifications
        }
      );
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentStudy.metadata.protocolId}_ComplianceExport_v${currentStudy.metadata.version}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setAppIsProcessing(false);
    }
  };

  const handleSaveSubmissionMetadata = (submissionMetadata: SubmissionMetadata) => {
    backgroundValidationEngine.updateState((prev) => ({
      study: prev.study
        ? {
            ...prev.study,
            submissionMetadata,
          }
        : prev.study
    }));
    setAppStatus("Submission metadata draft saved in session");
  };

  const handleLoadBaselineWorkbook = async (file: File) => {
    setAppIsProcessing(true);
    setBaselineError(null);
    setAppStatus("Loading baseline workbook...");
    try {
      const parsedBaseline = await parseBaselineWorkbookFile(file);
      setBaselineStudy(parsedBaseline);
      setAppStatus(`Baseline loaded (${parsedBaseline.metadata.protocolId})`);
    } catch (error) {
      if (error instanceof BaselineWorkbookParseError) {
        setBaselineError(error.userMessage);
      } else {
        setBaselineError("Could not parse selected baseline workbook.");
      }
      setAppStatus("Baseline load failed");
    } finally {
      setAppIsProcessing(false);
    }
  };

  // 3. View Router Logic
  const renderContextualView = () => {
    // STATE 1: Checking status on startup
    if (isInitialized === null) {
      return (
        <div className={styles.scanningText}>
          <Spinner size="small" label="Scanning Workbook..." />
        </div>
      );
    }

    // STATE 2: The Welcome Screen (No Matrix architecture detected)
    if (!isInitialized) {
      return (
        <div className={styles.welcomeCard}>
          <Text className={styles.welcomeTitle} block>
            Welcome to CRF.xl
          </Text>
          <Text className={styles.welcomeDesc} block>
            It looks like you are starting a new project on a blank canvas. Initialize the Matrix
            Architecture to set up your clinical study.
          </Text>
          <Button
            appearance="secondary"
            onClick={handleInitialize}
            disabled={isProcessing}
            icon={isProcessing ? <Spinner size="tiny" /> : undefined}
            style={{
              width: "100%",
              backgroundColor: tokens.colorNeutralBackground1,
              color: tokens.colorBrandForeground1,
            }}
          >
            ✨ Initialize Canvas
          </Button>
        </div>
      );
    }

    // STATE 3: Waiting for Telemetry
    if (!activeSheet) {
      return (
        <div className={styles.syncText}>
          <Spinner size="tiny" label="Syncing with Excel cursor..." />
        </div>
      );
    }

    // STATE 4: The Contextual Routing
    if (activeSheet === "_Study" || activeSheet === "_Forms") {
      return (
        <RegistryView
          onInit={handleInitialize}
          onSync={handleSync}
          onLoadSubmissionMetadata={async () => {
            backgroundValidationEngine.triggerValidation(
              activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined,
              0
            );
          }}
          onLoadBaselineWorkbook={handleLoadBaselineWorkbook}
          onSaveSubmissionMetadata={handleSaveSubmissionMetadata}
          activeSheet={activeSheet}
          submissionMetadata={study?.submissionMetadata}
          baselineStudy={baselineStudy}
          baselineError={baselineError}
          isProcessing={isProcessing}
          study={study}
          issues={issues}
        />
      );
    }
    if (activeSheet === "_Schedule" || activeSheet === "_Codelists") {
      return (
        <MatrixView
          onComplianceExport={handleComplianceExport}
          isProcessing={isProcessing}
          hasErrors={issues.some((i) => i.level === "Error") || hasMissingJustifications}
          isLoaded={!!studySummary}
          study={study}
          baselineStudy={baselineStudy}
          studyDiffReport={studyDiffReport}
          onNavigate={(sheetName, rowIndex) => {
            if (rowIndex !== undefined && sheetName) {
              navigateToSource(sheetName, rowIndex);
            }
          }}
        />
      );
    }
    if (!activeSheet.startsWith("_")) {
      return (
        <AuthoringView
          sheetName={activeSheet}
          isProcessing={isProcessing}
        />
      );
    }
    return null;
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoBox}>C</div>
          <div className={styles.titleBlock}>
            <span className={styles.appTitle}>CRF.xl</span>
            {isInitialized && (
              <span className={styles.sheetLabel}>{activeSheet || "Loading..."}</span>
            )}
          </div>
        </div>
        <Badge appearance="tint" color="informative">
          {displayStatus}
        </Badge>
      </header>

      <main className={styles.main}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_e, data) => setActiveTab(data.value as string)}
          style={{ marginBottom: "12px" }}
        >
          <Tab value="design">Design</Tab>
          <Tab value="compliance">Compliance</Tab>
          <Tab value="integrity">Integrity Hub</Tab>
        </TabList>

        {versionUpdate && (
          <MessageBar intent="info">
            <MessageBarBody>
              <strong>Update available:</strong> CRF.xl v{versionUpdate.version}
              {versionUpdate.description ? ` — ${versionUpdate.description}` : ""}
              {safeChangelogUrl && (
                <span>
                  {" "}
                  <a href={safeChangelogUrl} target="_blank" rel="noreferrer">
                    View changelog
                  </a>
                </span>
              )}
              <div className={styles.recoveryActions}>
                <Button size="small" appearance="subtle" onClick={handleDismissVersionUpdate}>
                  Dismiss
                </Button>
              </div>
            </MessageBarBody>
          </MessageBar>
        )}
        {recoverySnapshot && (
          <MessageBar intent={recoverySnapshot.workbookChanged ? "warning" : "info"}>
            <MessageBarBody>
              Recovery snapshot detected from{" "}
              {new Date(recoverySnapshot.snapshot.savedAt).toLocaleString()}.
              {recoverySnapshot.workbookChanged &&
                " Workbook structure has changed since this snapshot; review restored results carefully."}
              <div className={styles.recoveryActions}>
                <Button appearance="primary" size="small" onClick={handleRestoreSnapshot}>
                  Restore
                </Button>
                <Button appearance="secondary" size="small" onClick={handleDismissSnapshot}>
                  Dismiss
                </Button>
              </div>
            </MessageBarBody>
          </MessageBar>
        )}
        {storageWarning && (
          <MessageBar intent="warning">
            <MessageBarBody>{storageWarning}</MessageBarBody>
          </MessageBar>
        )}
        {isCodelistActive && activeTab === "design" && <DictionarySidecar />}
        {!isCodelistActive && activeTab === "design" && renderContextualView()}
        {activeTab === "compliance" && <ComplianceGovernanceView />}
        {activeTab === "integrity" && (
          <IntegrityHubView
            issues={issues}
            diffReport={studyDiffReport}
            onSignOff={() => {
              setIsSignedOff(true);
              setSignOffTimestamp(new Date().toISOString());
            }}
            onExport={handleComplianceExport}
            isSignedOff={isSignedOff}
            signOffTimestamp={signOffTimestamp}
          />
        )}

        {syncConflict && (
          <MessageBar intent="error">
            <MessageBarBody>
              <strong>Conflict Detected:</strong> The workbook was modified during a background
              sync.
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    speculativeSyncManager.resolveConflict(true);
                    setSyncConflict(null);
                  }}
                >
                  Keep Manual Edits
                </Button>
                <Button
                  size="small"
                  appearance="primary"
                  onClick={() => {
                    speculativeSyncManager.resolveConflict(false);
                    setSyncConflict(null);
                  }}
                >
                  Overwrite with Sync
                </Button>
                <Button
                  size="small"
                  appearance="outline"
                  onClick={() => {
                    speculativeSyncManager.rollback();
                    setSyncConflict(null);
                  }}
                >
                  Rollback
                </Button>
              </div>
            </MessageBarBody>
          </MessageBar>
        )}

        {uiError && (
          <MessageBar intent="error">
            <MessageBarBody>
              <strong>{uiError.message}</strong> {uiError.recoveryAction}
              {uiError.retryAction && (
                <span>
                  {" "}
                  <Button size="small" appearance="secondary" onClick={uiError.retryAction}>
                    Retry
                  </Button>
                </span>
              )}
              <span>
                {" "}
                <Button size="small" appearance="subtle" onClick={dismissUiError}>
                  Dismiss
                </Button>
              </span>
            </MessageBarBody>
          </MessageBar>
        )}

        {isInitialized && (
          <ValidationLog
            issues={issues}
            isProcessing={isProcessing}
            onNavigate={(i: ValidationIssue) => {
              const sheet = i.location?.includes("Events") ? "_Schedule" : i.sheetName;
              if (i.sourceRowIndex !== undefined && sheet) navigateToSource(sheet, i.sourceRowIndex);
            }}
          />
        )}

        <AuditOrchestratorModal
          isOpen={showAuditModal}
          onOpenChange={setShowAuditModal}
          report={studyDiffReport}
          justifications={justifications}
          onSaveJustifications={handleSaveJustifications}
        />

        <Dialog open={showGate} onOpenChange={(_, data) => setShowGate(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Resolve Annotations</DialogTitle>
              <DialogContent>
                <p>There are {orphanedCount} unresolved annotations or comments in the workbook.</p>
                <p>
                  You must resolve or remove all orphaned annotations before completing the compliance export to ensure data integrity.
                </p>
              </DialogContent>
              <DialogActions>
                <Button appearance="primary" onClick={() => setShowGate(false)}>
                  Close
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </main>
    </div>
  );
};

export default App;
