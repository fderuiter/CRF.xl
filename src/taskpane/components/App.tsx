import { highlightErrorsOnCanvas, clearAllAnnotations, getOrphanedAnnotationsCount } from "../core/services/annotation-service";
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
import { ComplianceExportService } from "../core/services/compliance-export-service";
import { VaultService } from "../core/services/vault-service";

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

// Telemetry & Views
import { useExcelTelemetry } from "./views/useExcelTelemetry";
import { RegistryView } from "./views/RegistryView";
import { MatrixView } from "./views/MatrixView";
import { AuthoringView } from "./views/AuthoringView";
import { DictionarySidecar } from "./views/DictionarySidecar";

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
  const { activeSheet, isCodelistActive } = useExcelTelemetry();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  // 2. Application State
  const [study, setStudy] = useState<StudyDesign | null>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [syncConflict, setSyncConflict] = useState<any>(null);
  const [baselineStudy, setBaselineStudy] = useState<StudyDesign | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [uiError, setUiError] = useState<
    (OfficeErrorPresentation & { retryAction?: () => Promise<void> }) | null
  >(null);

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
          setStudy(details.predictedStudy);
        }
      } else if (state === "conflict") {
        setIsBackgroundSyncing(false);
        setSyncConflict(details);
      } else if (state === "idle") {
        setIsBackgroundSyncing(false);
        if (details?.study) {
          setStudy(details.study); // rollback case
        }
      } else if (state === "error") {
        setIsBackgroundSyncing(false);
        setUiError({
          errorClass: "unknownOfficeError",
          message: "Background sync failed.",
          recoveryAction: "Check workbook and retry.",
          allowRetry: true,
          diagnosticCode: "SYNC_ERROR"
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
    setIssues(recoverySnapshot.snapshot.issues as ValidationIssue[]);
    setStudySummary(recoverySnapshot.snapshot.studySummary);
    setCurrentFilter(recoverySnapshot.snapshot.uiState.currentFilter ?? null);
    setStatus(
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
    setIsProcessing(true);
    setStatus("Scaffolding canvas...");
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
      setStatus("Canvas initialized");
    } catch (e) {
      setStatus("Init failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setIsProcessing(true);
    setStatus("Warping sheets...");
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
      setStatus("Sheets synchronized");
    } catch (e) {
      setStatus("Sync failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const performAnalysis = async (sheetFilter?: string): Promise<StudyDesign | null> => {
    setIsProcessing(true);
    setStatus("Analyzing workbook...");
    try {
      const freshStudy = await runWithOfficeErrorHandling(
        () =>
          parseExcelToStudyDesign({
            chunkSize: 250,
            timeoutMs: 45_000,
            cancellationToken: {
              isCancelled: () => !isMountedRef.current,
            },
            onProgress: (progress) => {
              if (!isMountedRef.current) return;
              setStatus(`Analyzing: ${progress.message} (${progress.completed}/${progress.total})`);
            },
          }),
        async () => {
          await performAnalysis(sheetFilter);
        }
      );
      if (!freshStudy) {
        setStatus("Analysis failed");
        return null;
      }
      setStudy(freshStudy);
      const validationIssues = validateStudyDesign(freshStudy, sheetFilter);
      
      // Sync to Vault
      const vaultService = new VaultService();
      const studyHashInput = JSON.stringify(freshStudy);
      // We must dynamically import crypto-js or require it. Wait, we can just let App.tsx import it? No, we shouldn't use crypto-js directly in App.tsx if we don't import it. We can do it inside vaultService!
      vaultService.syncValidationResults(freshStudy.metadata.protocolId || "UNKNOWN", freshStudy.metadata.version || "1.0", validationIssues, CryptoJS.SHA256(JSON.stringify(freshStudy)).toString(CryptoJS.enc.Hex));

      setIssues(validationIssues);
      setStudySummary(summarizeStudyDesign(freshStudy));
      setCurrentFilter(sheetFilter ?? null);
      const parseWarnings = freshStudy.metadata.customProperties?.parseWarnings;
      const hasParseWarnings = Array.isArray(parseWarnings) && parseWarnings.length > 0;

      let snapshotFingerprint: WorkbookFingerprint | undefined = undefined;
      try {
        snapshotFingerprint = await Excel.run(async (context) => {
          const sheets = context.workbook.worksheets;
          sheets.load("items/name");
          await context.sync();
          const sheetNames = sheets.items.map((sheet) => sheet.name).sort();
          return { sheetCount: sheetNames.length, sheetNames };
        });
      } catch {
        snapshotFingerprint = undefined;
      }
      setWorkbookFingerprint(snapshotFingerprint);

      const openForm = activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined;
      const snapshot = createRecoverySnapshot({
        issues: validationIssues,
        studySummary: summarizeStudyDesign(freshStudy),
        openForm,
        currentFilter: sheetFilter,
        workbookFingerprint: snapshotFingerprint,
      });
      const saveResult = persistRecoverySnapshot(snapshot);
      if ("reason" in saveResult && saveResult.reason === "quota-exceeded") {
        setStorageWarning("Recovery checkpoint could not be saved (localStorage quota exceeded).");
      } else if (saveResult.saved) {
        setStorageWarning(null);
      }
      setRecoverySnapshot(null);

      // Step 1: Clean previous annotations
      const sheetsToClear = sheetFilter
        ? [sheetFilter]
        : ["_Schedule", ...Object.keys(freshStudy.forms)];
      await clearAllAnnotations(sheetsToClear);

      // Step 2: Visual Validation - Paint the Excel Grid
      await highlightErrorsOnCanvas(validationIssues);
      if (hasParseWarnings) {
        setStatus("Analysis completed with partial parse warnings");
      } else {
        setStatus(
          validationIssues.some((i) => i.level === "Error")
            ? "Issues detected"
            : "Specification clean"
        );
      }
      return freshStudy;
    } catch (e) {
      setStatus("Analysis failed");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplianceExport = async () => {
    const s = await performAnalysis();
    if (!s || issues.some((i) => i.level === "Error")) return;

    // Check for orphaned annotations
    const sheets = ["_Study", "_Schedule", "_Codelists", "_Dictionaries", "_Rules"];
    Object.keys(s.forms).forEach(f => sheets.push(f));
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
    setIsProcessing(true);
    try {
      const zipBlob = await ComplianceExportService.createExportPackage(currentStudy, baselineStudy, issues);
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentStudy.metadata.protocolId}_ComplianceExport_v${currentStudy.metadata.version}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSubmissionMetadata = (submissionMetadata: SubmissionMetadata) => {
    setStudy((current) =>
      current
        ? {
            ...current,
            submissionMetadata,
          }
        : current
    );
    setStatus("Submission metadata draft saved in session");
  };

  const handleLoadBaselineWorkbook = async (file: File) => {
    setIsProcessing(true);
    setBaselineError(null);
    setStatus("Loading baseline workbook...");
    try {
      const parsedBaseline = await parseBaselineWorkbookFile(file);
      setBaselineStudy(parsedBaseline);
      setStatus(`Baseline loaded (${parsedBaseline.metadata.protocolId})`);
    } catch (error) {
      if (error instanceof BaselineWorkbookParseError) {
        setBaselineError(error.userMessage);
      } else {
        setBaselineError("Could not parse selected baseline workbook.");
      }
      setStatus("Baseline load failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const studyDiffReport = React.useMemo(() => {
    if (!baselineStudy || !study) return null;
    return diffStudyDesigns(baselineStudy, study);
  }, [baselineStudy, study]);

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
            await performAnalysis();
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
          onAnalyze={() => performAnalysis()}
          onComplianceExport={handleComplianceExport}
          isProcessing={isProcessing}
          hasErrors={issues.some((i) => i.level === "Error")}
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
          onValidate={() => performAnalysis(activeSheet)}
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
          {status}
        </Badge>
      </header>

      <main className={styles.main}>
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
        {isCodelistActive && <DictionarySidecar />}
        {!isCodelistActive && renderContextualView()}
        
      {syncConflict && (
        <MessageBar intent="error">
          <MessageBarBody>
            <strong>Conflict Detected:</strong> The workbook was modified during a background sync.
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <Button size="small" onClick={() => { speculativeSyncManager.resolveConflict(true); setSyncConflict(null); }}>Keep Manual Edits</Button>
              <Button size="small" appearance="primary" onClick={() => { speculativeSyncManager.resolveConflict(false); setSyncConflict(null); }}>Overwrite with Sync</Button>
              <Button size="small" appearance="outline" onClick={() => { speculativeSyncManager.rollback(); setSyncConflict(null); }}>Rollback</Button>
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
            onNavigate={(i) => {
              const sheet = i.location?.includes("Events") ? "_Schedule" : i.sheetName;
              if (i.rowIndex !== undefined && sheet) navigateToSource(sheet, i.rowIndex);
            }}
          />
        )}

        <Dialog open={showGate} onOpenChange={(_, data) => setShowGate(data.open)}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Resolve Annotations</DialogTitle>
              <DialogContent>
                <p>There are {orphanedCount} unresolved annotations or comments in the workbook.</p>
                <p>Would you like to proceed with the export and sign the Verification Manifest anyway?</p>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setShowGate(false)}>Cancel</Button>
                <Button appearance="primary" onClick={() => confirmComplianceExport(study!)}>Acknowledge & Export</Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </main>
    </div>
  );
};

export default App;
