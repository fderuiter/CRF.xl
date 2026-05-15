import { highlightErrorsOnCanvas, clearAllAnnotations } from '../core/services/annotation-service';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { makeStyles, tokens, Text, Badge, Spinner } from '@fluentui/react-components';

// Core Logic
import { ValidationLog } from './ValidationLog';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';
import { initializeWorkbook, navigateToSource, syncRegistry } from '../core/parser/template-generator';
import { StudyDesign } from '../core/types/index';

// Telemetry & Views
import { useExcelTelemetry } from './views/useExcelTelemetry';
import { RegistryView } from './views/RegistryView';
import { MatrixView } from './views/MatrixView';
import { AuthoringView } from './views/AuthoringView';
import { DictionarySidecar } from './views/DictionarySidecar';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: tokens.colorNeutralBackground2,
        overflow: 'hidden',
    },
    header: {
        padding: '10px 16px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        boxShadow: tokens.shadow2,
        zIndex: 10,
    },
    headerBrand: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    logo: {
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
        flexShrink: 0,
    },
    brandTextCol: {
        display: 'flex',
        flexDirection: 'column',
    },
    appTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightBold,
        color: tokens.colorBrandForeground1,
        lineHeight: '1.1',
    },
    activeSheet: {
        fontSize: tokens.fontSizeBase100,
        color: tokens.colorNeutralForeground3,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop: '2px',
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '12px',
        overflow: 'hidden',
        position: 'relative',
    },
    loadingText: {
        textAlign: 'center',
        padding: '32px 16px',
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase200,
    },
    scanningRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '32px 16px',
    },
});

export const App: React.FC<{ title?: string }> = () => {
    const styles = useStyles();

    // 1. Telemetry & Initialization State
    const { activeSheet, isCodelistActive } = useExcelTelemetry();
    const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

    // 2. Application State
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");

    // Startup Check: Does the Matrix architecture exist yet?
    useEffect(() => {
        const checkInit = async () => {
            try {
                await Excel.run(async (context) => {
                    const sheet = context.workbook.worksheets.getItemOrNullObject("_Study");
                    await context.sync();
                    setIsInitialized(!sheet.isNullObject);
                });
            } catch (e) {
                setIsInitialized(false);
            }
        };
        checkInit();
    }, []);

    // --- Action Handlers ---
    const handleInitialize = async () => {
        setIsProcessing(true); setStatus("Scaffolding canvas...");
        try {
            await initializeWorkbook();
            setIsInitialized(true);
            setStatus("Canvas initialized");
        }
        catch (e) { setStatus("Init failed"); }
        finally { setIsProcessing(false); }
    };

    const handleSync = async () => {
        setIsProcessing(true); setStatus("Warping sheets...");
        try { await syncRegistry(); setStatus("Sheets synchronized"); }
        catch (e) { setStatus("Sync failed"); }
        finally { setIsProcessing(false); }
    };

    const performAnalysis = async (sheetFilter?: string): Promise<StudyDesign | null> => {
        setIsProcessing(true); setStatus("Analyzing workbook...");
        try {
            const freshStudy = await parseExcelToStudyDesign();
            setStudy(freshStudy);
            const validationIssues = validateStudyDesign(freshStudy, sheetFilter);
            setIssues(validationIssues);

            const sheetsToClear = sheetFilter
                ? [sheetFilter]
                : ["_Schedule", ...Object.keys(freshStudy.forms)];
            await clearAllAnnotations(sheetsToClear);
            await highlightErrorsOnCanvas(validationIssues);
            setStatus(validationIssues.some(i => i.level === 'Error') ? "Issues detected" : "Specification clean");
            return freshStudy;
        } catch (e) {
            console.error(e); setStatus("Analysis failed"); return null;
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
        if (isInitialized === null) {
            return (
                <div className={styles.scanningRow}>
                    <Spinner size="tiny" />
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Scanning Workbook...</Text>
                </div>
            );
        }

        if (!isInitialized) {
            return <RegistryView onInit={handleInitialize} onSync={handleSync} isProcessing={isProcessing} isWelcome />;
        }

        if (!activeSheet) {
            return (
                <div className={styles.scanningRow}>
                    <Spinner size="tiny" />
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Syncing with Excel cursor...</Text>
                </div>
            );
        }

        if (activeSheet === "_Study" || activeSheet === "_Forms") {
            return <RegistryView onInit={handleInitialize} onSync={handleSync} isProcessing={isProcessing} />;
        }
        if (activeSheet === "_Schedule" || activeSheet === "_Codelists") {
            return <MatrixView onAnalyze={() => performAnalysis()} onDocx={handleDocxExport} onOdm={handleOdmExport} isProcessing={isProcessing} hasErrors={issues.some(i => i.level === 'Error')} isLoaded={!!study} />;
        }
        if (!activeSheet.startsWith("_")) {
            return <AuthoringView sheetName={activeSheet} onValidate={() => performAnalysis(activeSheet)} isProcessing={isProcessing} />;
        }
        return null;
    };

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div className={styles.headerBrand}>
                    <div className={styles.logo}>C</div>
                    <div className={styles.brandTextCol}>
                        <span className={styles.appTitle}>CRF.xl</span>
                        {isInitialized && (
                            <span className={styles.activeSheet}>{activeSheet || 'Loading...'}</span>
                        )}
                    </div>
                </div>
                <Badge appearance="tint" color="informative">{status}</Badge>
            </header>

            <main className={styles.main}>
                {isCodelistActive && <DictionarySidecar />}
                {!isCodelistActive && renderContextualView()}

                {isInitialized && (
                    <ValidationLog
                        issues={issues}
                        isProcessing={isProcessing}
                        onNavigate={(i: ValidationIssue & { rowIndex?: number }) => {
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
