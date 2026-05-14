import * as React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { ValidationLog } from './ValidationLog';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';
import { initializeWorkbook, navigateToSource } from '../core/parser/template-generator';
import { StudyDesign } from '../core/types/index';

/**
 * App: The Clinical Metadata Orchestrator
 * Ensures the "Golden Path": Initialize -> Author -> Analyze -> Validate -> Export.
 */
export const App: React.FC<{ title?: string }> = ({ title }) => {
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");

    /**
     * Centralized Analysis: Syncs Excel data to the in-memory clinical model.
     */
    const performAnalysis = async (): Promise<StudyDesign | null> => {
        setIsProcessing(true);
        setStatus("Analyzing workbook...");
        try {
            const freshStudy = await parseExcelToStudyDesign();
            setStudy(freshStudy);
            
            const validationIssues = validateStudyDesign(freshStudy);
            setIssues(validationIssues);
            
            const hasErrors = validationIssues.some(i => i.level === 'Error');
            setStatus(hasErrors ? "Issues detected" : "Specification clean");
            
            return freshStudy;
        } catch (e) {
            console.error("Analysis Failure:", e);
            setStatus("Analysis failed");
            setIssues([{ 
                level: 'Error', 
                message: "Critical Workbook Access Error: Verify that all required sheets are present and accessible." 
            }]);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Handlers for Exports: Blocked if 'Error' level issues exist.
     */
    const handleDocxExport = async () => {
        const activeStudy = await performAnalysis();
        if (!activeStudy) return;

        if (issues.some(i => i.level === 'Error')) {
            setStatus("Export blocked: Fix errors");
            return;
        }

        setIsProcessing(true);
        setStatus("Generating Paper CRF...");
        try {
            await generateDocx(activeStudy);
            setStatus("Word document ready");
        } catch (e) {
            setStatus("Word export failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOdmExport = async () => {
        const activeStudy = await performAnalysis();
        if (!activeStudy) return;

        if (issues.some(i => i.level === 'Error')) {
            setStatus("Export blocked: Fix errors");
            return;
        }

        setIsProcessing(true);
        setStatus("Generating ODM XML...");
        try {
            const xml = generateOdmXml(activeStudy);
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            
            // Senior Dev: Use Protocol ID and Version for naming
            const filename = `${activeStudy.metadata.protocolId}_ODM_v${activeStudy.metadata.version}.xml`;
            
            a.href = url;
            a.download = filename.replace(/\s+/g, '_');
            a.click();
            URL.revokeObjectURL(url);
            
            setStatus("ODM XML ready");
        } catch (e) {
            setStatus("ODM export failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInitialize = async () => {
        setIsProcessing(true);
        setStatus("Scaffolding workbook...");
        try {
            await initializeWorkbook();
            setIssues([]);
            setStudy(null);
            setStatus("Template initialized");
        } catch (e) {
            setStatus("Initialization failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">C</div>
                    <h1 className="text-xl font-black text-blue-900 tracking-tighter leading-none">CRF.xl</h1>
                </div>
                <div className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    {status}
                </div>
            </header>
            
            <main className="flex-grow flex flex-col p-4 gap-4 overflow-hidden">
                <ControlPanel 
                    onInit={handleInitialize}
                    onDocx={handleDocxExport}
                    onOdm={handleOdmExport}
                    onAnalyze={performAnalysis}
                    isProcessing={isProcessing}
                    hasErrors={issues.some(i => i.level === 'Error')}
                    isLoaded={!!study}
                />
                
                <ValidationLog 
                    issues={issues} 
                    onNavigate={(i) => {
                        const sheet = i.location?.includes('Events') ? "Events" : "Items";
                        if (i.rowIndex !== undefined) navigateToSource(sheet, i.rowIndex);
                    }} 
                />
            </main>
            
            <footer className="p-3 text-center border-t bg-white">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    Meticulously Validated Production Export
                </p>
            </footer>
        </div>
    );
};

export default App;
