import * as React from 'react';

interface ControlPanelProps {
    onGenerateDocx: () => Promise<void>;
    onExportOdm: () => Promise<void>;
    onInitialize: () => Promise<void>;
    isProcessing: boolean;
    currentStep: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    onGenerateDocx, 
    onExportOdm, 
    onInitialize, 
    isProcessing,
    currentStep 
}) => {
    return (
        <div className="space-y-3">
            {/* Step 1 Action */}
            <button 
                onClick={onInitialize}
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white p-4 rounded-2xl transition-all shadow-md group text-left relative overflow-hidden"
            >
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-black tracking-tight">✨ Initialize Workbook</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Scaffold required sheets and environmental metadata.</p>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v19M5 8l7-7 7 7M5 21h14"/></svg>
                </div>
            </button>

            <div className="h-px bg-slate-200 my-2 mx-4" />

            {/* Step 3 Action */}
            <button 
                onClick={onGenerateDocx}
                disabled={isProcessing || currentStep < 2}
                className="w-full bg-white hover:border-blue-500 disabled:opacity-40 border-2 border-slate-200 text-slate-800 p-4 rounded-2xl transition-all shadow-sm text-left group"
            >
                <div className="flex items-center gap-2 mb-0.5 text-blue-700">
                    <span className="text-sm font-black tracking-tight">📄 Generate Paper CRF</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic">Analyzes sheets & creates handwriting-ready .docx</p>
            </button>

            {/* Step 4 Action */}
            <button 
                onClick={onExportOdm}
                disabled={isProcessing || currentStep < 3}
                className="w-full bg-white hover:border-purple-500 disabled:opacity-40 border-2 border-slate-200 text-slate-800 p-4 rounded-2xl transition-all shadow-sm text-left group"
            >
                <div className="flex items-center gap-2 mb-0.5 text-purple-700">
                    <span className="text-sm font-black tracking-tight">⚛️ Export CDISC ODM</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium italic">Production-ready XML for Medidata, Veeva, or Rave.</p>
            </button>
        </div>
    );
};
