import * as React from 'react';
import { useState } from 'react';
import { ControlPanel } from './ControlPanel';
import { ValidationLog } from './ValidationLog';
import { StudyDesign } from '../core/types';
import { ValidationIssue } from '../core/parser/validator';
import { parseExcelToStudyDesign } from '../core/parser/excel-parser';
import { validateStudyDesign } from '../core/parser/validator';

/**
 * Main Application Component
 * Manages the global state for the parsed study and validation issues.
 */
export const App: React.FC = () => {
    const [study, setStudy] = useState<StudyDesign | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>("");

    const handleRunAnalysis = async () => {
        setIsProcessing(true);
        setStatusMessage("Reading Excel workbook...");
        
        try {
            // 1. Parse Excel to StudyDesign
            const parsedStudy = await parseExcelToStudyDesign();
            setStudy(parsedStudy);
            
            // 2. Validate the Study
            setStatusMessage("Validating clinical metadata...");
            const validationIssues = validateStudyDesign(parsedStudy);
            setIssues(validationIssues);
            
            if (validationIssues.length === 0) {
                setStatusMessage("Analysis complete. No issues found.");
            } else {
                setStatusMessage(`Analysis complete. Found ${validationIssues.length} issue(s).`);
            }
        } catch (error) {
            console.error(error);
            setIssues([{ 
                level: 'Error', 
                message: error instanceof Error ? error.message : "An unknown error occurred during parsing." 
            }]);
            setStatusMessage("Processing failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-screen p-4 bg-slate-50 text-slate-900 font-sans">
            <header className="mb-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold">
                        C
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-blue-900 leading-none">
                            CRF.xl
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
                            Clinical Spec Engine
                        </p>
                    </div>
                </div>
            </header>
            
            <main className="flex-grow flex flex-col gap-6 overflow-hidden">
                <ControlPanel 
                    onRunAnalysis={handleRunAnalysis} 
                    isProcessing={isProcessing}
                    studyLoaded={!!study}
                />
                
                <div className="flex flex-col flex-grow overflow-hidden">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {statusMessage || "System Ready"}
                        </h2>
                    </div>
                    <ValidationLog issues={issues} isProcessing={isProcessing} />
                </div>
            </main>
            
            <footer className="mt-4 pt-4 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-400">
                    v1.0.0 | CDISC ODM & SDTM Compliant
                </p>
            </footer>
        </div>
    );
};

export default App;
