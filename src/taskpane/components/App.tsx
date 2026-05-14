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
        setStatus("Analyzing workbook...");
        try {
            const study = await parseExcelToStudyDesign();
            const valIssues = validateStudyDesign(study);
            setIssues(valIssues);
            const hasErrors = valIssues.some(i => i.level === 'Error');
            setStatus(hasErrors ? "Issues found" : "Specification clean");
            return study;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Parsing failed";
            setIssues([{ level: 'Error', message: msg }]);
            setStatus("Analysis failed");
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInit = async () => {
        setIsProcessing(true);
        setStatus("Initializing...");
        try {
            await initializeWorkbook();
            setStatus("Template initialized");
            setIssues([]);
        } catch (e) {
            setStatus("Initialization failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDocx = async () => {
        const study = await runAnalysis();
        if (study) {
            setIsProcessing(true);
            setStatus("Generating Paper CRF...");
            try {
                await generateDocx(study);
                setStatus("Word document ready");
            } catch (e) {
                setStatus("Word export failed");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleOdm = async () => {
        const study = await runAnalysis();
        if (study) {
            setIsProcessing(true);
            setStatus("Generating ODM XML...");
            try {
                const xml = generateOdmXml(study);
                const blob = new Blob([xml], { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${study.metadata.protocolId}_ODM_v${study.metadata.version}.xml`;
                a.click();
                URL.revokeObjectURL(url);
                setStatus("ODM exported");
            } catch (e) {
                setStatus("ODM export failed");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <header className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-black">C</div>
                    <div>
                        <h1 className="text-lg font-black text-blue-900 leading-none">CRF.xl</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clinical Engine</p>
                    </div>
                </div>
                <div className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    {status}
                </div>
            </header>
            
            <main className="flex-grow flex flex-col p-4 gap-4 overflow-hidden">
                <ControlPanel 
                    onInit={handleInit}
                    onDocx={handleDocx}
                    onOdm={handleOdm}
                    isProcessing={isProcessing}
                />
                <ValidationLog 
                    issues={issues} 
                    onNavigate={(i) => i.rowIndex !== undefined && navigateToSource("Items", i.rowIndex)} 
                />
            </main>
        </div>
    );
};

export default App;
