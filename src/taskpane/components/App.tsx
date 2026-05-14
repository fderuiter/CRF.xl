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
    const [statusMessage, setStatusMessage] = useState<string>("Ready");
    const [currentStep, setCurrentStep] = useState<number>(study ? 3 : 1);

    const handleInitialize = async () => {
        setIsProcessing(true);
        setStatusMessage("Initializing template...");
        try {
            await initializeWorkbook();
            setStatusMessage("Workbook ready.");
            setCurrentStep(2);
        } catch (error) {
            setStatusMessage("Init failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const prepareStudy = async () => {
        setIsProcessing(true);
        setStatusMessage("Analyzing workbook...");
        setIssues([]);
        try {
            const parsedStudy = await parseExcelToStudyDesign();
            setStudy(parsedStudy);
            const validationIssues = validateStudyDesign(parsedStudy);
            setIssues(validationIssues);
            
            const hasErrors = validationIssues.some(i => i.level === 'Error');
            if (hasErrors) {
                setCurrentStep(3); // Stuck at Validation
                setStatusMessage("Analysis found errors.");
                return null;
            } else {
                setCurrentStep(4); // Ready to Export
                setStatusMessage("Validated successfully.");
                return parsedStudy;
            }
        } catch (error) {
            setStatusMessage("Analysis failed.");
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
            a.download = `${data.metadata.protocolId}_ODM_Export.xml`;
            a.click();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Header Area */}
            <header className="p-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg">
                        C
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-blue-900 tracking-tight leading-none">CRF.xl</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clinical Builder</p>
                    </div>
                </div>
                {study && (
                    <div className="bg-blue-50 px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tighter">
                            {study.metadata.protocolId}
                        </span>
                    </div>
                )}
            </header>

            {/* Stepper UX */}
            <div className="flex justify-between px-6 py-4 bg-white/50 border-b border-slate-200">
                {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-1.5 opacity-100">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            currentStep >= step ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-500'
                        }`}>
                            {step}
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-tighter ${
                            currentStep >= step ? 'text-blue-800' : 'text-slate-400'
                        }`}>
                            {['Setup', 'Author', 'Analyze', 'Export'][step-1]}
                        </span>
                    </div>
                ))}
            </div>
            
            <main className="flex-grow flex flex-col p-4 gap-4 overflow-hidden relative">
                <ControlPanel 
                    onGenerateDocx={handleDocxFlow} 
                    onExportOdm={handleOdmFlow}
                    onInitialize={handleInitialize}
                    isProcessing={isProcessing}
                    currentStep={currentStep}
                />
                
                <div className="flex flex-col flex-grow overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{statusMessage}</h2>
                    </div>
                    <ValidationLog issues={issues} isProcessing={isProcessing} />
                </div>
            </main>
        </div>
    );
};
