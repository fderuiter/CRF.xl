import * as React from 'react';

interface ControlPanelProps {
    onGenerateDocx: () => Promise<void>;
    onExportOdm: () => Promise<void>;
    isProcessing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerateDocx, onExportOdm, isProcessing }) => {
    return (
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-3">
                <button 
                    onClick={onGenerateDocx}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : "📄 Generate Paper CRF (.docx)"}
                </button>

                <button 
                    onClick={onExportOdm}
                    disabled={isProcessing}
                    className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <span className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full"></span>
                    ) : "⚛️ Export CDISC ODM (.xml)"}
                </button>
                
                <p className="text-[10px] text-center text-slate-400 italic">
                    Analyzes 'Events', 'Forms', and 'Items' sheets
                </p>
            </div>
        </div>
    );
};
