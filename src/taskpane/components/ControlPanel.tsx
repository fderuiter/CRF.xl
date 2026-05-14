import * as React from 'react';

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
 * Implements strict visual gating based on the validation state.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    onInit, onDocx, onOdm, onAnalyze, isProcessing, hasErrors, isLoaded
}) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2">
                <button 
                    onClick={onInit} 
                    disabled={isProcessing} 
                    className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold text-xs shadow-sm hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <span>✨</span> Initialize Workbook
                </button>

                <button 
                    onClick={onAnalyze} 
                    disabled={isProcessing} 
                    className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold text-xs shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <span>🔍</span> {isProcessing ? 'Analyzing...' : 'Run Workbook Analysis'}
                </button>
            </div>
            
            <div className="h-px bg-slate-200 my-1 mx-2" />

            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={onDocx} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={`p-3 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 shadow-sm transition-all active:scale-[0.95] ${
                        hasErrors || !isLoaded
                            ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' 
                            : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                    }`}
                >
                    <span className="text-lg">📄</span>
                    Paper CRF
                </button>
                <button 
                    onClick={onOdm} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className={`p-3 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 shadow-sm transition-all active:scale-[0.95] ${
                        hasErrors || !isLoaded
                            ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' 
                            : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                    }`}
                >
                    <span className="text-lg">⚛️</span>
                    ODM XML
                </button>
            </div>
            
            {hasErrors && (
                <div className="p-2 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-[9px] text-red-600 font-black text-center uppercase tracking-tighter animate-pulse">
                        ⚠️ Critical errors blocking export.
                    </p>
                    <p className="text-[8px] text-red-400 text-center mt-0.5 font-medium">
                        Resolve all red issues in the log to proceed.
                    </p>
                </div>
            )}
            
            {!isLoaded && !hasErrors && (
                <p className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-widest">
                    Run Analysis to Enable Export
                </p>
            )}
        </div>
    );
};
