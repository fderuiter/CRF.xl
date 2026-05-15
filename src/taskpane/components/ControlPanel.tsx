import * as React from 'react';
import { Button } from './ui/DesignSystem';

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
                    variant="secondary" 
                    onClick={onInit} 
                    isLoading={isProcessing} 
                    icon={<span className="text-sm">✨</span>}
                >
                    Initialize Workbook
                </Button>

                <Button 
                    variant="primary" 
                    onClick={onAnalyze} 
                    isLoading={isProcessing} 
                    icon={<span className="text-sm">🔍</span>}
                >
                    {isProcessing ? 'Analyzing Metadata...' : 'Run Workbook Analysis'}
                </Button>
            </div>
            
            <div className="h-px bg-slate-200 my-2 mx-4 rounded-full opacity-50" />

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    onClick={onDocx} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={hasErrors || !isLoaded ? 'bg-slate-50 border-slate-100 text-slate-400' : 'text-blue-700 border-blue-200 hover:bg-blue-50'}
                >
                    <div className="flex flex-col items-center gap-1 py-1">
                        <span className="text-xl">📄</span>
                        <span className="text-[10px]">Paper CRF</span>
                    </div>
                </Button>

                <Button 
                    variant="outline" 
                    onClick={onOdm} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={hasErrors || !isLoaded ? 'bg-slate-50 border-slate-100 text-slate-400' : 'text-purple-700 border-purple-200 hover:bg-purple-50'}
                >
                    <div className="flex flex-col items-center gap-1 py-1">
                        <span className="text-xl">⚛️</span>
                        <span className="text-[10px]">ODM XML</span>
                    </div>
                </Button>
            </div>
            
            {hasErrors && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl shadow-inner">
                    <p className="text-[10px] text-red-600 font-black text-center uppercase tracking-widest animate-pulse">
                        ⚠️ Critical Errors Detected
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
