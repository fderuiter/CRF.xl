import * as React from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { SparkleRegular, SearchRegular, DocumentRegular, MoleculeRegular, WarningRegular } from '@fluentui/react-icons';

interface ControlPanelProps {
    onInit: () => Promise<void>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    onAnalyze: () => Promise<any>;
    isProcessing: boolean;
    hasErrors: boolean;
    isLoaded: boolean;
}

/**
 * ControlPanel: The primary action hub for clinical designers.
 * Refactored to consume the strict Atomic Design System.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    onInit, onDocx, onOdm, onAnalyze, isProcessing, hasErrors, isLoaded
}) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <Button 
                    appearance="secondary"
                    onClick={onInit} 
                    disabled={isProcessing}
                    icon={isProcessing ? <Spinner size="tiny" /> : <SparkleRegular />}
                >
                    Initialize Workbook
                </Button>

                <Button 
                    appearance="primary"
                    onClick={onAnalyze} 
                    disabled={isProcessing}
                    icon={isProcessing ? <Spinner size="tiny" /> : <SearchRegular />}
                >
                    {isProcessing ? 'Analyzing Metadata...' : 'Run Workbook Analysis'}
                </Button>
            </div>
            
            <div className="h-px bg-slate-200 my-2 mx-4 rounded-full opacity-50" />

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    appearance="outline"
                    onClick={onDocx} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={hasErrors || !isLoaded ? 'bg-slate-50 border-slate-100 text-slate-400' : 'text-blue-700 border-blue-200 hover:bg-blue-50'}
                >
                    <div className="flex flex-col items-center gap-1 py-1">
                        <DocumentRegular fontSize={20} />
                        <span className="text-[10px]">Paper CRF</span>
                    </div>
                </Button>

                <Button 
                    appearance="outline"
                    onClick={onOdm} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={hasErrors || !isLoaded ? 'bg-slate-50 border-slate-100 text-slate-400' : 'text-purple-700 border-purple-200 hover:bg-purple-50'}
                >
                    <div className="flex flex-col items-center gap-1 py-1">
                        <MoleculeRegular fontSize={20} />
                        <span className="text-[10px]">ODM XML</span>
                    </div>
                </Button>
            </div>
            
            {hasErrors && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl shadow-inner">
                    <p className="text-[10px] flex items-center justify-center gap-1 text-red-600 font-black text-center uppercase tracking-widest animate-pulse">
                        <WarningRegular /> Critical Errors Detected
                    </p>
                    <p className="text-[9px] text-red-500 text-center mt-1 font-medium">
                        Resolve highlighted issues in Excel to unlock export capabilities.
                    </p>
                </div>
            )}
            
            {!isLoaded && !hasErrors && (
                <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest mt-2">
                    Awaiting Analysis
                </p>
            )}
        </div>
    );
};
