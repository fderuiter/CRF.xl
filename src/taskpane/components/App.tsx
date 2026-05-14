import * as React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { ValidationLog } from './ValidationLog';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';
import { initializeWorkbook, navigateToSource } from '../core/parser/template-generator';

export const App: React.FC = () => {
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("Ready");

    const runAnalysis = async () => {
        setIsProcessing(true);
        setStatus("Analyzing...");
        try {
            const study = await parseExcelToStudyDesign();
            const valIssues = validateStudyDesign(study);
            setIssues(valIssues);
            setStatus(valIssues.some(i => i.level === 'Error') ? "Issues Found" : "Clean");
            return study;
        } catch (e) {
            setIssues([{ level: 'Error', message: "Workbook Error: Check sheet names." }]);
            setStatus("Failed");
            return null;
        } finally { setIsProcessing(false); }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="p-4 bg-white border-b flex justify-between items-center">
                <h1 className="text-xl font-black text-blue-900 tracking-tighter leading-none">CRF.xl</h1>
                <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">{status}</div>
            </header>
            <main className="flex-grow flex flex-col p-4 gap-4 overflow-hidden">
                <ControlPanel 
                    onInit={async () => { setIsProcessing(true); await initializeWorkbook(); setIsProcessing(false); setStatus("Initialized"); }}
                    onDocx={async () => { const s = await runAnalysis(); if (s) await generateDocx(s); }}
                    onOdm={async () => { 
                        const s = await runAnalysis(); 
                        if (s) {
                            const xml = generateOdmXml(s);
                            const blob = new Blob([xml], { type: 'application/xml' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a"); a.href = url; a.download = "study_export.xml"; a.click();
                        }
                    }}
                    isProcessing={isProcessing}
                />
                <ValidationLog issues={issues} onNavigate={(i) => i.rowIndex !== undefined && navigateToSource("Items", i.rowIndex)} />
            </main>
        </div>
    );
};

export default App;
