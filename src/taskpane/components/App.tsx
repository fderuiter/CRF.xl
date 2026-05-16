import { highlightErrorsOnCanvas, clearAllAnnotations } from '../core/services/annotation-service';
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { makeStyles, tokens, Spinner, Badge, Text, Button, MessageBar, MessageBarBody } from '@fluentui/react-components';

// Core Logic
import { ValidationLog } from './ValidationLog';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';
import { initializeWorkbook, navigateToSource, syncRegistry } from '../core/parser/template-generator';
import { StudyDesign } from '../core/types/index';
import {
    RecoverySnapshot,
    WorkbookFingerprint,
    createRecoverySnapshot,
    dismissRecoverySnapshot,
    hasWorkbookChanged,
    persistRecoverySnapshot,
    readRecoverySnapshot,
    summarizeStudyDesign,
} from '../core/services/recovery-storage';
import { createOfficeErrorPresentation, OfficeErrorPresentation } from '../core/services/office-error-handling';

// Telemetry & Views
import { useExcelTelemetry } from './views/useExcelTelemetry';
import { RegistryView } from './views/RegistryView';
import { MatrixView } from './views/MatrixView';
import { AuthoringView } from './views/AuthoringView';
import { DictionarySidecar } from './views/DictionarySidecar';

const useAppStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: tokens.colorNeutralBackground3,
        overflow: 'hidden',
    },
    header: {
        padding: '12px 16px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        boxShadow: tokens.shadow2,
        zIndex: 10,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    logoBox: {
        width: '32px',
        height: '32px',
        backgroundColor: tokens.colorBrandBackground,
        borderRadius: tokens.borderRadiusMedium,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tokens.colorNeutralForegroundOnBrand,
        fontWeight: tokens.fontWeightBold,
        fontSize: tokens.fontSizeBase300,
        boxShadow: tokens.shadow4,
    },
    titleBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    appTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorBrandForeground1,
        lineHeight: '1',
        letterSpacing: '-0.5px',
    },
    sheetLabel: {
        fontSize: tokens.fontSizeBase100,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        marginTop: '2px',
    },
    main: {
        position: 'relative',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '12px',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
    scanningText: {
        textAlign: 'center',
        padding: '32px 0',
        color: tokens.colorNeutralForeground3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
    },
    syncText: {
        textAlign: 'center',
        padding: '16px 0',
        color: tokens.colorNeutralForeground3,
    },
    welcomeCard: {
        backgroundColor: tokens.colorBrandBackground,
        borderRadius: tokens.borderRadiusXLarge,
        padding: '24px',
        color: tokens.colorNeutralForegroundOnBrand,
        boxShadow: tokens.shadow8,
        position: 'relative',
        overflow: 'hidden',
    },
    welcomeTitle: {
        fontSize: tokens.fontSizeBase500,
        fontWeight: tokens.fontWeightBold,
        marginBottom: '8px',
        color: tokens.colorNeutralForegroundOnBrand,
    },
    welcomeDesc: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForegroundOnBrand,
        marginBottom: '20px',
        lineHeight: '1.5',
        opacity: 0.9,
    },
    initButton: {
        width: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorBrandForeground1,
        fontWeight: tokens.fontWeightBold,
    },
    recoveryActions: {
        marginTop: '8px',
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
    },
});

export const App: React.FC<{ title?: string }> = () => {
    const styles = useAppStyles();
    const isMountedRef = useRef(true);
    // 1. Telemetry & Initialization State
    const { activeSheet, isCodelistActive } = useExcelTelemetry();
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

    // 2. Application State
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [studySummary, setStudySummary] = useState<{ formCount: number; variableCount: number; visitCount: number } | null>(null);
    const [currentFilter, setCurrentFilter] = useState<string | null>(null);
    const [workbookFingerprint, setWorkbookFingerprint] = useState<WorkbookFingerprint | undefined>(undefined);
    const [recoverySnapshot, setRecoverySnapshot] = useState<{ snapshot: RecoverySnapshot; workbookChanged: boolean } | null>(null);
    const [storageWarning, setStorageWarning] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");
    const [uiError, setUiError] = useState<(OfficeErrorPresentation & { retryAction?: () => Promise<void> }) | null>(null);

    const dismissUiError = () => setUiError(null);

    const presentOfficeError = (error: unknown, retryAction?: () => Promise<void>) => {
        const presentation = createOfficeErrorPresentation(error);
        console.error(`[${presentation.diagnosticCode}]`, error);
        setUiError({
            ...presentation,
            retryAction: presentation.allowRetry ? retryAction : undefined,
        });
    };

    const runWithOfficeErrorHandling = async <T,>(operation: () => Promise<T>, retryAction?: () => Promise<void>): Promise<T | null> => {
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

    // Startup Check: Does the Matrix architecture exist yet?
    useEffect(() => {
        const checkInit = async () => {
            const result = await runWithOfficeErrorHandling(async () => {
                await Excel.run(async (context) => {
                    const sheet = context.workbook.worksheets.getItemOrNullObject("_Study");
                    await context.sync();
                    setIsInitialized(!sheet.isNullObject);
                });
                return true;
            }, async () => {
                await checkInit();
            });
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
            if ('reason' in saveResult && saveResult.reason === "quota-exceeded") {
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
        setStatus(`Recovered snapshot from ${new Date(recoverySnapshot.snapshot.savedAt).toLocaleString()}`);
        setRecoverySnapshot(null);
    };

    const handleDismissSnapshot = () => {
        dismissRecoverySnapshot();
        setRecoverySnapshot(null);
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
        setIsProcessing(true); setStatus("Scaffolding canvas...");
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
        }
        catch (e) { setStatus("Init failed"); }
        finally { setIsProcessing(false); }
    };

    const handleSync = async () => {
        setIsProcessing(true); setStatus("Warping sheets...");
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
        }
        catch (e) { setStatus("Sync failed"); } 
        finally { setIsProcessing(false); }
    };

    const performAnalysis = async (sheetFilter?: string): Promise<StudyDesign | null> => {
        setIsProcessing(true); setStatus("Analyzing workbook...");
        try {
            const freshStudy = await runWithOfficeErrorHandling(
                () => parseExcelToStudyDesign({
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
            if ('reason' in saveResult && saveResult.reason === "quota-exceeded") {
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
                setStatus(validationIssues.some(i => i.level === 'Error') ? "Issues detected" : "Specification clean");
            }
            return freshStudy;
        } catch (e) {
            setStatus("Analysis failed"); return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDocxExport = async () => {
        const s = await performAnalysis();
        if (s && !issues.some(i => i.level === 'Error')) await generateDocx(s);
    };

    const handleOdmExport = async () => {
        const s = await performAnalysis();
        if (s && !issues.some(i => i.level === 'Error')) {
            const xml = generateOdmXml(s);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
            a.download = `${s.metadata.protocolId}_ODM.xml`;
            a.click();
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
                    <Text className={styles.welcomeTitle} block>Welcome to CRF.xl</Text>
                    <Text className={styles.welcomeDesc} block>
                        It looks like you are starting a new project on a blank canvas. Initialize the Matrix Architecture to set up your clinical study.
                    </Text>
                    <Button
                        appearance="secondary"
                        onClick={handleInitialize}
                        disabled={isProcessing}
                        icon={isProcessing ? <Spinner size="tiny" /> : undefined}
                        style={{ width: '100%', backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorBrandForeground1 }}
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
            return <RegistryView onInit={handleInitialize} onSync={handleSync} isProcessing={isProcessing} />;
        }
        if (activeSheet === "_Schedule" || activeSheet === "_Codelists") {
            return <MatrixView onAnalyze={() => performAnalysis()} onDocx={handleDocxExport} onOdm={handleOdmExport} isProcessing={isProcessing} hasErrors={issues.some(i => i.level === 'Error')} isLoaded={!!studySummary} />;
        }
        if (!activeSheet.startsWith("_")) {
            return <AuthoringView sheetName={activeSheet} onValidate={() => performAnalysis(activeSheet)} isProcessing={isProcessing} />;
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
                            <span className={styles.sheetLabel}>{activeSheet || 'Loading...'}</span>
                        )}
                    </div>
                </div>
                <Badge appearance="tint" color="informative">{status}</Badge>
            </header>
            
            <main className={styles.main}>
                {recoverySnapshot && (
                    <MessageBar intent={recoverySnapshot.workbookChanged ? "warning" : "info"}>
                        <MessageBarBody>
                            Recovery snapshot detected from {new Date(recoverySnapshot.snapshot.savedAt).toLocaleString()}.
                            {recoverySnapshot.workbookChanged && " Workbook structure has changed since this snapshot; review restored results carefully."}
                            <div className={styles.recoveryActions}>
                                <Button appearance="primary" size="small" onClick={handleRestoreSnapshot}>Restore</Button>
                                <Button appearance="secondary" size="small" onClick={handleDismissSnapshot}>Dismiss</Button>
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
                            const sheet = i.location?.includes('Events') ? "_Schedule" : i.sheetName;
                            if (i.rowIndex !== undefined && sheet) navigateToSource(sheet, i.rowIndex);
                        }}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
