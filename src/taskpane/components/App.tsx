import * as React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { ValidationLog } from './ValidationLog';
import { StudyDesign } from '../core/types';
import { ValidationIssue, validateStudyDesign } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { generateDocx } from '../core/generators/docx/docx-builder';
import { generateOdmXml } from '../core/generators/cdisc/odm-builder';

/**
 * App Component: The Orchestrator
 * Manages the transition from Excel metadata to Paper (.docx) or Data (.xml) standards.
 */
export const App: React.FC = () => {
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("Ready to analyze");

    /**
     * Shared logic to parse and validate the workbook before export.
     */
    const prepareStudy = async () => {
        setIsProcessing(true);
        setStatusMessage("Reading Excel sheets...");
        setIssues([]);
        
        try {
            const parsedStudy = await parseExcelToStudyDesign();
            setStudy(parsedStudy);
            
            setStatusMessage("Validating clinical metadata...");
            const validationIssues = validateStudyDesign(parsedStudy);
            setIssues(validationIssues);
            
            const hasHardErrors = validationIssues.some(i => i.level === 'Error');
            if (hasHardErrors) {
                setStatusMessage("Export blocked: Critical errors found.");
                return null;
            }
            return parsedStudy;
        } catch (error) {
            console.error("Preparation Error:", error);
            setStatusMessage("Processing failed.");
            setIssues([{ 
                level: 'Error', 
                message: error instanceof Error ? error.message : "Critical failure reading workbook." 
            }]);
            return null;
        }
    };

    /**
     * Flow 1: Generate the Paper CRF Word Document
     */
    const handleDocxFlow = async () => {
        const studyData = await prepareStudy();
        if (!studyData) {
            setIsProcessing(false);
            return;
        }

        try {
            setStatusMessage("Generating Paper CRF (.docx)...");
            await generateDocx(studyData);
            setStatusMessage("Success! Word document generated.");
        } catch (error) {
            setStatusMessage("Word generation failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Flow 2: Export CDISC ODM XML
     */
    const handleOdmFlow = async () => {
        const studyData = await prepareStudy();
        if (!studyData) {
            setIsProcessing(false);
            return;
        }

        try {
            setStatusMessage("Generating CDISC ODM XML...");
            const xmlContent = generateOdmXml(studyData);
            
            // Trigger XML download
            const blob = new Blob([xmlContent], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${studyData.metadata.protocolId}_ODM_v${studyData.metadata.version}.xml`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            setStatusMessage("Success! ODM XML exported.");
        } catch (error) {
            setStatusMessage("ODM export failed.");
        } finally {
            setIsProcessing(false);
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
                    isProcessing={isProcessing}
                />
                
                <div className="flex flex-col flex-grow overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {statusMessage}
                        </h2>
                    </div>
                    <ValidationLog issues={issues} isProcessing={isProcessing} />
                </div>
            </main>
            
            <footer className="mt-4 pt-4 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-400">Validated 21 CFR Part 11 Output</p>
            </footer>
        </div>
    );
};

export default App;
