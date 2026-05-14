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

    const handleAction = async (action: () => Promise<any>, successMsg: string) => {
        setIsProcessing(true);
        setStatus("Processing...");
        try {
            await action();
            setStatus(successMsg);
        } catch (e) {
            setStatus("Action failed");
            setIssues([{ level: 'Error', message: e instanceof Error ? e.message : "Unknown error" }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const runAnalysis = async () => {
        setIsProcessing(true);
        setStatus("Analyzing...");
        try {
            const study = await parseExcelToStudyDesign();
            const valIssues = validateStudyDesign(study);
            setIssues(valIssues);
            setStatus(valIssues.some(i => i.level === 'Error') ? "Errors found" : "Validated");
            return study;
        } catch (e) {
            setIssues([{ level: 'Error', message: "Parsing failed" }]);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans">
            <header className="p-4 bg-white border-b flex justify-between items-center">
                <h1 className="text-xl font-black text-blue-900">CRF.xl</h1>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase tracking-widest">{status}</span>
            </header>
            <main className="p-4 flex flex-col gap-4 overflow-hidden">
                <ControlPanel 
                    onInit={() => handleAction(initializeWorkbook, "Template created")}
                    onDocx={async () => { const s = await runAnalysis(); if (s) await generateDocx(s); }}
                    onOdm={async () => { 
                        const s = await runAnalysis(); 
                        if (s) {
                            const xml = generateOdmXml(s);
                            const blob = new Blob([xml], { type: 'text/xml' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = "study.xml"; a.click();
                        }
                    }}
                    isProcessing={isProcessing}
                />
                <ValidationLog issues={issues} onNavigate={(i) => navigateToSource("Items", i.rowIndex)} />
            </main>
        </div>
    );
};
