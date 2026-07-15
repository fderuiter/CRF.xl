/**
 * @issue #28
 */
import {
  applyValidationVisuals,
  getOrphanedAnnotationsCount,
  annotationPaintbrushService,
  refreshAnnotationHighlights,
  bindingService,
} from "../core";
import { createParseRuntime } from "../core";
import * as React from "react";
import { sha256Native } from "../core/utils/crypto-utils";
import { useState, useEffect, useRef } from "react";

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
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Dropdown,
  Option,
} from "@fluentui/react-components";

// Core Logic
import { upgradeSystemSheetsToTables } from "../core/factory/sheet-factory";
import { ValidationLog } from "./ValidationLog";
import { ValidationIssue } from "../core";
import { complianceGovernanceService } from "../core";
import { VaultService } from "../core";
import { LinguisticService } from "../core";

import { diffStudyDesigns } from "../core";
import { initializeWorkbook, navigateToSource, syncRegistry } from "../core";
import { StudyDesign, SubmissionMetadata, ExportMode, ExportOptions } from "../core";
import { BaselineWorkbookParseError, parseBaselineWorkbookFile } from "../core";
import {
  RECOVERY_APP_VERSION,
  summarizeStudyDesign,
  formatDate,
} from "../core";
import { createOfficeDiagnostic } from "../core";
import { VersionUpdateMetadata, checkForVersionUpdate, dismissVersionNotification } from "../core";
import { loadImportManifest, onboardingService } from "../core";

// Telemetry & Views
import { RegistryView } from "./views/RegistryView";
import { ComplianceGovernanceView } from "./views/ComplianceGovernanceView";
import { TabList, Tab } from "@fluentui/react-components";
import { MatrixView } from "./views/MatrixView";
import { AuthoringView } from "./views/AuthoringView";
import { IntegrityHubView } from "./views/IntegrityHubView";
import { DictionarySidecar } from "./views/DictionarySidecar";
import { AuditOrchestratorModal } from "./AuditOrchestratorModal";
import { AuditJustification, DriftWarning, detectDrifts, applyManualReAnchor } from "../core";
import { OnboardingTour } from "./OnboardingTour";
import { ReviewView } from "./views/ReviewView";

import { useAppOrchestrator } from "../hooks/useAppOrchestrator";

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

import { useAnnouncer } from "../hooks/useAnnouncer";
import { appOrchestrator } from "../core/services/app-orchestrator";

export const App: React.FC<{ title?: string }> = () => {
  const styles = useAppStyles();
  const isMountedRef = useRef(true);
  const { announcement, announce } = useAnnouncer();

  useEffect(() => {
    const onboarding = onboardingService.getState();
    if (!onboarding.isCompleted && !onboarding.isActive) {
      onboardingService.start();
    }
  }, []);

  // 1. Unified Orchestrator State
  const { state, actions } = useAppOrchestrator();
  const {
    activeSheet,
    isCodelistActive,
    study,
    issues,
    isProcessing,
    status: validationStatus,
    syncConflict,
    recoverySnapshot,
    storageWarning,
    uiError,
    isSyncing
  } = state;

  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [appIsProcessing, setAppIsProcessing] = useState(false);
  const [appStatus, setAppStatus] = useState("Ready");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    mode: ExportMode.PRIMARY_ONLY,
    primaryLocale: "en-US",
  });
  const [annotationProgress, setAnnotationProgress] = useState<string | null>(null);

  const totalIsProcessing = isProcessing || appIsProcessing || isSyncing;
  const status = isProcessing ? validationStatus : appStatus;
  const displayStatus = annotationProgress || status;

  const lastVisualsRef = useRef<{ study: any; activeSheet: string | null } | null>(null);

  useEffect(() => {
    if (isInitialized) {
      // Handle Paintbrush target selection on change
      const paintbrush = annotationPaintbrushService.getState();
      if (paintbrush.isEnabled && activeSheet && !activeSheet.startsWith("_")) {
        const context = bindingService.getCurrentContext();
        if (context && context.isValid) {
          annotationPaintbrushService
            .toggleTarget(context.sheetName, context.address)
            .then(() => refreshAnnotationHighlights(context.sheetName))
            .catch(console.error);
        }
      }
    }
  }, [isInitialized, activeSheet]);

  // Initial highlight refresh on sheet change
  useEffect(() => {
    if (isInitialized && activeSheet && !activeSheet.startsWith("_")) {
      refreshAnnotationHighlights(activeSheet).catch(console.error);
    }
  }, [activeSheet, isInitialized]);

  useEffect(() => {
    if (study && study.metadata.defaultLanguage) {
      const normalizedDefault = LinguisticService.normalizeLocale(study.metadata.defaultLanguage);
      // Reset language if current selection is null or not supported in the current study
      if (
        !selectedLanguage ||
        (study.metadata.supportedLanguages &&
          !study.metadata.supportedLanguages.includes(selectedLanguage))
      ) {
        setSelectedLanguage(normalizedDefault);
      }
    }
  }, [study]);

  useEffect(() => {
    if (study && !totalIsProcessing) {
      // 1. Visual Validation
      if (
        !lastVisualsRef.current ||
        lastVisualsRef.current.study !== study ||
        lastVisualsRef.current.activeSheet !== activeSheet
      ) {
        lastVisualsRef.current = { study, activeSheet };
        const sheetsToClear =
          activeSheet && !activeSheet.startsWith("_")
            ? [activeSheet]
            : ["_Schedule", ...Object.keys(study.forms)];

        const runtime = createParseRuntime({
          onProgress: (update) => {
            const percent = Math.round((update.completed / update.total) * 100);
            setAnnotationProgress(`Annotations: ${update.message} (${percent}%)`);
          },
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
      sha256Native(JSON.stringify(study))
        .then((hash) => {
          return vaultService.syncValidationResults(
            study.metadata.protocolId || "UNKNOWN",
            study.metadata.version || "1.0",
            issues,
            hash
          );
        })
        .catch(console.error);

      // 4. Environment Compliance
      if (!complianceGovernanceService.isAuthenticated) {
        complianceGovernanceService.initialize().catch(console.error);
      }
      
      // 5. Detect drifts
      detectDrifts().then(setDrifts).catch(console.error);
      Office.context.document.getFilePropertiesAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          const documentUrl = result.value.url || "local://document";
          complianceGovernanceService
            .getEnvironmentStatus(documentUrl)
            .then((envStatus) => {
              if (!envStatus.isCompliant) {
                const issue: ValidationIssue = {
                  level: "Error",
                  message: envStatus.isCloudHosted
                    ? "SharePoint location is not configured for GxP version history."
                    : "Workbook is saved locally. Move to a SharePoint location to meet audit trail requirements.",
                  location: "Host Environment",
                };
                // Add if not already present
                if (
                  !issues.some((i) => i.location === issue.location && i.message === issue.message)
                ) {
                  actions.injectValidationIssue(issue);
                }
              } else {
                if (issues.some((i) => i.location === "Host Environment")) {
                  actions.clearValidationIssueByLocation("Host Environment");
                }
              }
            })
            .catch(console.error);
        }
      });
    }
  }, [study, issues, totalIsProcessing, activeSheet]);

  const [baselineStudy, setBaselineStudy] = useState<StudyDesign | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [studySummary, setStudySummary] = useState<{
    formCount: number;
    variableCount: number;
    visitCount: number;
  } | null>(null);
  const [, setCurrentFilter] = useState<string | null>(null);
  const [versionUpdate, setVersionUpdate] = useState<VersionUpdateMetadata | null>(null);
  const safeChangelogUrl = toSafeHttpUrl(versionUpdate?.changelogUrl);
  const [justifications, setJustifications] = useState<Record<string, AuditJustification>>({});
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [isSignedOff, setIsSignedOff] = useState(false);
  const [signOffTimestamp, setSignOffTimestamp] = useState<string | null>(null);
  const [drifts, setDrifts] = useState<DriftWarning[]>([]);

  // Push justifications to orchestrator
  useEffect(() => {
    actions.updateJustifications(justifications);
  }, [justifications]);

  // Revert sign-off if study changes
  useEffect(() => {
    if (isSignedOff) {
      setIsSignedOff(false);
      setSignOffTimestamp(null);
    }
  }, [study, issues]);

  const errorContainerRef = useRef<HTMLDivElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (uiError) {
      if (!previousFocusRef.current && document.activeElement && document.activeElement !== document.body) {
        previousFocusRef.current = document.activeElement as HTMLElement;
      }
      setTimeout(() => {
        if (retryButtonRef.current) {
          retryButtonRef.current.focus();
        } else if (errorContainerRef.current) {
          errorContainerRef.current.focus();
        }
      }, 0);
    } else {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [uiError]);

  const dismissUiError = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
    actions.dismissUiError();
  };

  const presentOfficeError = (error: unknown, retryAction?: () => Promise<void>) => {
    const diagnostic = createOfficeDiagnostic(error);
    console.error(`[${diagnostic.category}]`, error);
    // Since UI Error is in Orchestrator now, wait... actually Orchestrator handles binding errors.
    // For manual operation errors, we might still want local state, but we can just use Orchestrator state.
    appOrchestrator["updateState"]({ 
      uiError: {
        ...diagnostic.toJSON(),
        retryAction: diagnostic.allowRetry ? retryAction : undefined,
      } 
    } as any);
  };

  const runWithOfficeErrorHandling = async <T,>(
    operation: () => Promise<T>,
    retryAction?: () => Promise<void>
  ): Promise<T | null> => {
    dismissUiError();
    try {
      return await operation();
    } catch (error) {
      const diagnostic = createOfficeDiagnostic(error);

      if (diagnostic.category.includes("OFFICE_CONTEXT_SYNC_FAILURE")) {
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
    if (syncConflict) {
      announce("Conflict Detected: The workbook was modified during a background sync.", "assertive");
    }
  }, [syncConflict]);

  // Startup Check: Does the Matrix architecture exist yet?
  useEffect(() => {
    const checkInit = async () => {
      if (typeof Excel === "undefined") {
        setIsInitialized(true);
        return;
      }
      const result = await runWithOfficeErrorHandling(
        async () => {
          await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItemOrNullObject("_Study");
            await context.sync();
            const init = !sheet.isNullObject;
            setIsInitialized(init);
            if (init) {
              await upgradeSystemSheetsToTables(context);
            }
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

  const handleRestoreSnapshot = () => {
    const snapshot = actions.restoreRecoverySnapshot();
    if (snapshot) {
      setStudySummary(snapshot.studySummary);
      setCurrentFilter(snapshot.uiState.currentFilter ?? null);
      if (snapshot.justifications) {
        handleSaveJustifications(snapshot.justifications);
      }
      setAppStatus(`Recovered snapshot from ${formatDate(snapshot.savedAt)}`);
    }
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
          complianceGovernanceService
            .initialize()
            .then(() => {
              if (complianceGovernanceService.isAuthenticated) {
                complianceGovernanceService.syncSharePointMetadata(documentUrl, newJustifs);
              }
            })
            .catch(() => {});
        }
      });
    } catch (e) {
      console.warn("Failed to persist/sync justifications", e);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      complianceGovernanceService
        .loadJustificationsFromWorkbook()
        .then((loaded) => {
          if (Object.keys(loaded).length > 0) {
            setJustifications((prev) => ({ ...prev, ...loaded }));
          }
        })
        .catch(console.warn);
    }
  }, [isInitialized]);

  React.useEffect(() => {
    if (studyDiffReport && hasMissingJustifications) {
      setShowAuditModal(true);
    }
  }, [studyDiffReport, hasMissingJustifications]);

  const handleReAnchor = async (annotationId: string, newAddress: string) => {
    try {
      await applyManualReAnchor(annotationId, newAddress);
      const updatedDrifts = await detectDrifts();
      setDrifts(updatedDrifts);
      announce("Annotation re-anchored successfully.", "polite");
    } catch (e) {
      console.error(e);
      presentOfficeError({
        severity: "error",
        category: "REANCHOR_FAILED",
        message: "Failed to manually re-anchor annotation.",
        allowRetry: false,
      });
    }
  };

  const handleComplianceExport = async () => {
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
      presentOfficeError({
        severity: "error",
        category: "ENV_NONCOMPLIANT",
        message: "Environment is not compliant.",
        recoveryAction:
          "Open the Compliance tab to view and remediate environment issues before exporting.",
        allowRetry: false,
      });
      setActiveTab("compliance");
      return;
    }

    const s = study;
    if (totalIsProcessing) {
      presentOfficeError({
        severity: "error",
        category: "ANALYSIS_IN_PROGRESS",
        message: "Analysis is currently running in the background.",
        recoveryAction: "Please wait a moment and try again.",
        allowRetry: false,
      });
      return;
    }
    if (!s || issues.some((i) => i.level === "Error")) return;

    setExportOptions({
      mode: ExportMode.PRIMARY_ONLY,
      primaryLocale: selectedLanguage || s.metadata.defaultLanguage || "en-US",
      secondaryLocale: s.metadata.supportedLanguages?.find(
        (l) => l !== (selectedLanguage || s.metadata.defaultLanguage)
      ),
    });
    setShowExportOptions(true);
  };

  const proceedWithExport = async () => {
    setShowExportOptions(false);
    const s = study;
    if (!s) return;

    const sheets = ["_Study", "_Schedule", "_Codelists", "_Dictionaries", "_Rules"];
    Object.keys(s.forms).forEach((f) => sheets.push(f));
    const count = await getOrphanedAnnotationsCount(sheets);
    if (count > 0) {
      setOrphanedCount(count);
      setShowGate(true);
    } else {
      await confirmComplianceExport(s, exportOptions);
    }
  };

  const confirmComplianceExport = async (currentStudy: StudyDesign, options?: ExportOptions) => {
    setShowGate(false);
    setAppIsProcessing(true);
    try {
      const manifest = loadImportManifest();
      const { ComplianceExportService } =
        await import("../core/services/compliance-export-service");
      const zipBlob = await ComplianceExportService.createExportPackage(
        currentStudy,
        baselineStudy,
        issues,
        {
          signedOffAt: signOffTimestamp,
          source_provenance: manifest?.provenance,
          justifications: justifications,
          exportOptions: options,
        }
      );
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentStudy.metadata.protocolId}_ComplianceExport_v${currentStudy.metadata.version}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.message === "COMPRESSION_NOT_SUPPORTED") {
        presentOfficeError({
          severity: "error",
          category: "COMPRESSION_NOT_SUPPORTED",
          message: "Native compression is not supported by your browser.",
          recoveryAction:
            "Please use a modern browser (Chrome, Edge, or Safari) to export compliance artifacts.",
          allowRetry: false,
        });
      } else {
        console.error(err);
      }
    } finally {
      setAppIsProcessing(false);
    }
  };

  const handleSaveSubmissionMetadata = (submissionMetadata: SubmissionMetadata) => {
    actions.updateStudySubmissionMetadata(submissionMetadata);
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
            id="tour-init-canvas"
            appearance="secondary"
            onClick={handleInitialize}
            disabled={totalIsProcessing}
            icon={totalIsProcessing ? <Spinner size="tiny" /> : undefined}
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
            actions.requestValidation(activeSheet && !activeSheet.startsWith("_") ? activeSheet : undefined);
          }}
          onLoadBaselineWorkbook={handleLoadBaselineWorkbook}
          onSaveSubmissionMetadata={handleSaveSubmissionMetadata}
          activeSheet={activeSheet}
          submissionMetadata={study?.submissionMetadata}
          baselineStudy={baselineStudy}
          baselineError={baselineError}
          isProcessing={totalIsProcessing}
          study={study}
          issues={issues}
        />
      );
    }
    if (activeSheet === "_Schedule" || activeSheet === "_Codelists") {
      return (
        <MatrixView
          onComplianceExport={handleComplianceExport}
          isProcessing={totalIsProcessing}
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
          isProcessing={totalIsProcessing}
          onError={presentOfficeError}
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
            <span className={styles.appTitle}>
              CRF.xl{activeTab === "review" ? " | Review" : ""}
            </span>
            {isInitialized && activeTab !== "review" && (
              <span className={styles.sheetLabel}>{activeSheet || "Loading..."}</span>
            )}
            {isInitialized && activeTab === "review" && (
              <span className={styles.sheetLabel}>Review Mode</span>
            )}
          </div>
          {isInitialized &&
            study?.metadata?.supportedLanguages &&
            study.metadata.supportedLanguages.length > 1 && (
              <div style={{ marginLeft: "16px" }}>
                <Dropdown
                  size="small"
                  value={selectedLanguage || study.metadata.defaultLanguage}
                  onOptionSelect={(_e, data) => setSelectedLanguage(data.optionValue!)}
                  aria-label="Language selection"
                >
                  {study.metadata.supportedLanguages.map((lang) => (
                    <Option key={lang} value={lang}>
                      {lang}
                    </Option>
                  ))}
                </Dropdown>
              </div>
            )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Badge appearance="tint" color="informative">
            {displayStatus}
          </Badge>
          <Button
            size="small"
            appearance="subtle"
            onClick={() => onboardingService.start()}
            icon={<span>💡</span>}
            title="Start Guided Tour"
          >
            Tour
          </Button>
        </div>
      </header>

      <main className={styles.main}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_e, data) => setActiveTab(data.value as string)}
          style={{ marginBottom: "12px" }}
        >
          <Tab value="design" id="tab-design">
            Design
          </Tab>
          <Tab value="compliance" id="tab-compliance">
            Governance Dashboard
          </Tab>
          <Tab value="integrity" id="tour-integrity">
            Integrity Hub
          </Tab>
          <Tab value="review" id="tab-review">
            Review
          </Tab>
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
              Recovery snapshot detected from {formatDate(recoverySnapshot.snapshot.savedAt)}.
              {recoverySnapshot.workbookChanged &&
                " Workbook structure has changed since this snapshot; review restored results carefully."}
              <div className={styles.recoveryActions}>
                <Button appearance="primary" size="small" onClick={handleRestoreSnapshot}>
                  Restore
                </Button>
                <Button appearance="secondary" size="small" onClick={actions.dismissRecoverySnapshot}>
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
        {isCodelistActive && activeTab === "design" && (
          <DictionarySidecar
            selectedLanguage={selectedLanguage || study?.metadata.defaultLanguage || "en-US"}
            defaultLanguage={study?.metadata.defaultLanguage || "en-US"}
            supportedLanguages={study?.metadata.supportedLanguages}
          />
        )}
        {!isCodelistActive && activeTab === "design" && renderContextualView()}
        {activeTab === "compliance" && <ComplianceGovernanceView />}
        {activeTab === "review" && study && <ReviewView study={study} issues={issues} />}
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
            drifts={drifts}
            onReAnchor={handleReAnchor}
          />
        )}

        <OnboardingTour />

        {syncConflict && (
          <MessageBar intent="error">
            <MessageBarBody>
              <strong>Conflict Detected:</strong> The workbook was modified during a background
              sync.
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    actions.resolveConflict(true);
                  }}
                >
                  Keep Manual Edits
                </Button>
                <Button
                  size="small"
                  appearance="primary"
                  onClick={() => {
                    actions.resolveConflict(false);
                  }}
                >
                  Overwrite with Sync
                </Button>
                <Button
                  size="small"
                  appearance="outline"
                  onClick={() => {
                    actions.rollbackSync();
                  }}
                >
                  Rollback
                </Button>
              </div>
            </MessageBarBody>
          </MessageBar>
        )}

        <div
          ref={errorContainerRef}
          aria-live="polite"
          tabIndex={-1}
          style={{ display: uiError ? "block" : "none", outline: "none" }}
        >
          {uiError && (
            <MessageBar
              intent={
                uiError.severity === "warning"
                  ? "warning"
                  : uiError.severity === "info"
                    ? "info"
                    : "error"
              }
            >
              <MessageBarBody>
                <strong>{uiError.message}</strong> {uiError.recoveryAction}
                {uiError.retryAction && (
                  <span>
                    {" "}
                    <Button
                      ref={retryButtonRef}
                      size="small"
                      appearance="secondary"
                      onClick={() => {
                        if (previousFocusRef.current) {
                          previousFocusRef.current.focus();
                        }
                        if (uiError.retryAction) {
                          uiError.retryAction();
                        }
                      }}
                    >
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
        </div>

        {isInitialized && (
          <ValidationLog
            issues={issues}
            isProcessing={totalIsProcessing}
            onNavigate={(i: ValidationIssue) => {
              const sheet = i.location?.includes("Events") ? "_Schedule" : i.sheetName;
              if (i.rowIndex !== undefined && sheet) navigateToSource(sheet, i.rowIndex);
            }}
          />
        )}

        <Dialog
          open={showExportOptions}
          onOpenChange={(_, data) => setShowExportOptions(data.open)}
        >
          <DialogSurface>
            <DialogBody>
              <DialogTitle>Export Configuration</DialogTitle>
              <DialogContent style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <Text block weight="semibold">
                    Export Mode
                  </Text>
                  <Dropdown
                    value={exportOptions.mode}
                    onOptionSelect={(_e, data) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        mode: data.optionValue as ExportMode,
                      }))
                    }
                    style={{ width: "100%" }}
                  >
                    <Option value={ExportMode.PRIMARY_ONLY}>Primary Locale Only</Option>
                    <Option value={ExportMode.BILINGUAL}>Bilingual (Primary / Secondary)</Option>
                    <Option value={ExportMode.ALL}>All Locales (Multi-locale appendix)</Option>
                  </Dropdown>
                </div>

                <div>
                  <Text block weight="semibold">
                    Primary Locale
                  </Text>
                  <Dropdown
                    value={exportOptions.primaryLocale}
                    onOptionSelect={(_e, data) =>
                      setExportOptions((prev) => ({ ...prev, primaryLocale: data.optionValue! }))
                    }
                    style={{ width: "100%" }}
                  >
                    {study?.metadata.supportedLanguages?.map((lang) => (
                      <Option key={lang} value={lang} text={lang}>
                        {lang}
                      </Option>
                    )) || (
                      <Option value={study?.metadata.defaultLanguage} text={study?.metadata.defaultLanguage || ""}>
                        {study?.metadata.defaultLanguage}
                      </Option>
                    )}
                  </Dropdown>
                </div>

                {exportOptions.mode === ExportMode.BILINGUAL && (
                  <div>
                    <Text block weight="semibold">
                      Secondary Locale
                    </Text>
                    <Dropdown
                      value={exportOptions.secondaryLocale}
                      onOptionSelect={(_e, data) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          secondaryLocale: data.optionValue!,
                        }))
                      }
                      style={{ width: "100%" }}
                    >
                      {study?.metadata.supportedLanguages?.map((lang) => (
                        <Option key={lang} value={lang}>
                          {lang}
                        </Option>
                      )) || <Option value="">None</Option>}
                    </Dropdown>
                  </div>
                )}
              </DialogContent>
              <DialogActions>
                <Button appearance="primary" onClick={proceedWithExport}>
                  Export
                </Button>
                <Button appearance="secondary" onClick={() => setShowExportOptions(false)}>
                  Cancel
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

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
                  You must resolve or remove all orphaned annotations before completing the
                  compliance export to ensure data integrity.
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

        {/* Global ARIA live region for screen readers */}
        <div
          aria-live={announcement ? announcement.priority : "polite"}
          aria-atomic="true"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {announcement ? announcement.message : ""}
        </div>
      </main>
    </div>
  );
};

export default App;
