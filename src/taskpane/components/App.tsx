import * as React from 'react';
import { useState, useEffect } from 'react';

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

export const App: React.FC<{ title?: string }> = () => {
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
            setIsInitialized(true); // Manually set to true once built
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
        // STATE 1: Checking status on startup
        if (isInitialized === null) {
            return <div className="text-center p-8 text-slate-400 text-xs animate-pulse font-bold">Scanning Workbook...</div>;
        }

        // STATE 2: The Welcome Screen (No Matrix architecture detected)
        if (!isInitialized) {
            return (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                        <h2 className="font-black text-xl mb-2 relative z-10">Welcome to CRF.xl</h2>
                        <p className="text-xs text-slate-300 mb-6 leading-relaxed relative z-10">
                            It looks like you are starting a new project on a blank canvas. Initialize the Matrix Architecture to set up your clinical study.
                        </p>
                        <button
                            onClick={handleInitialize}
                            disabled={isProcessing}
                            className="relative z-10 w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            ✨ Initialize Canvas
                        </button>
                    </div>
                </div>
            );
        }

        // STATE 3: Waiting for Telemetry
        if (!activeSheet) {
            return <div className="text-center p-4 text-slate-400 text-xs animate-pulse">Syncing with Excel cursor...</div>;
        }
        
        // STATE 4: The Contextual Routing
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
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">C</div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black text-blue-900 tracking-tighter leading-none">CRF.xl</h1>
                        {isInitialized && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeSheet || 'Loading...'}</span>}
                    </div>
                </div>
                <div className="bg-slate-100 px-2 py-1 rounded text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    {status}
                </div>
            </header>
            
            <main className="relative flex-grow flex flex-col p-4 gap-4 overflow-hidden">
                {isCodelistActive && <DictionarySidecar />}
                {!isCodelistActive && renderContextualView()}
                
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
