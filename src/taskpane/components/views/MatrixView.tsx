import * as React from 'react';

interface MatrixProps {
    onAnalyze: () => Promise<any>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    isProcessing: boolean;
    hasErrors: boolean;
    isLoaded: boolean;
}

export const MatrixView: React.FC<MatrixProps> = ({ onAnalyze, onDocx, onOdm, isProcessing, hasErrors, isLoaded }) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-lg">📅</div>
                <div>
                    <h2 className="font-black text-sm text-slate-800 tracking-tight">Visit Matrix</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Schedule & Export</p>
                </div>
            </div>
            
            <button 
                onClick={onAnalyze} 
                disabled={isProcessing} 
                className="w-full bg-slate-900 hover:bg-black text-white p-3 rounded-xl font-bold text-xs transition-all mb-4 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
                <span>🔍</span> Validate Entire Study
            </button>
            
            <div className="h-px bg-slate-100 mb-4" />
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onDocx} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className="bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-600 p-4 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="text-2xl">📄</span> 
                    <span>Paper CRF</span>
                </button>
                <button 
                    onClick={onOdm} 
                    disabled={isProcessing || hasErrors || !isLoaded} 
                    className="bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 text-slate-600 p-4 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="text-2xl">⚛️</span> 
                    <span>ODM XML</span>
                </button>
            </div>
        </div>
    </div>
);
