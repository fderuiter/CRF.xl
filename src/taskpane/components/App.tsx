import * as React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { ValidationLog } from './ValidationLog';
import { StudyDesign } from '../core/types';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';
import { initializeWorkbook } from '../core/parser/template-generator';

export const App: React.FC = () => {
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("Ready to analyze");

    const handleInitialize = async () => {
        setIsProcessing(true);
        setStatusMessage("Initializing clinical template...");
        try {
            await initializeWorkbook();
            setStatusMessage("Workbook initialized with env defaults.");
        } catch (error) {
            console.error(error);
            setStatusMessage("Initialization failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const prepareStudy = async () => {
        setIsProcessing(true);
        setStatusMessage("Reading Excel sheets...");
        setIssues([]);
        try {
            const parsedStudy = await parseExcelToStudyDesign();
            setStudy(parsedStudy);
            const validationIssues = validateStudyDesign(parsedStudy);
            setIssues(validationIssues);
            return validationIssues.some(i => i.level === 'Error') ? null : parsedStudy;
        } catch (error) {
            setStatusMessage("Parsing failed.");
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDocxFlow = async () => {
        const data = await prepareStudy();
        if (data) await generateDocx(data);
    };

    const handleOdmFlow = async () => {
        const data = await prepareStudy();
        if (data) {
            const xml = generateOdmXml(data);
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ODM_Export.xml`;
            a.click();
        }
    };

    return (
        <div className="flex flex-col h-screen p-4 bg-slate-50 text-slate-900 font-sans">
            <header className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold">C</div>
                    <div>
                        <h1 className="text-xl font-extrabold text-blue-900 leading-none">CRF.xl</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Clinical Spec Engine</p>
                    </div>
                </div>
            </header>
            <main className="flex-grow flex flex-col gap-6 overflow-hidden">
                <ControlPanel 
                    onGenerateDocx={handleDocxFlow} 
                    onExportOdm={handleOdmFlow}
                    onInitialize={handleInitialize}
                    isProcessing={isProcessing}
                />
                <div className="flex flex-col flex-grow overflow-hidden">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{statusMessage}</h2>
                    <ValidationLog issues={issues} isProcessing={isProcessing} />
                </div>
            </main>
        </div>
    );
};
