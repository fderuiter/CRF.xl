import * as React from 'react';

interface ControlPanelProps {
    onGenerateDocx: () => Promise<void>;
    onExportOdm: () => Promise<void>;
    onInitialize: () => Promise<void>;
    isProcessing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerateDocx, onExportOdm, onInitialize, isProcessing }) => {
    return (
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-3">
                <button 
                    onClick={onInitialize}
                    disabled={isProcessing}
                    className="w-full bg-slate-800 hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                    ✨ Initialize Workbook Template
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button 
                    onClick={onGenerateDocx}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                    📄 Generate Paper CRF (.docx)
                </button>
                <button 
                    onClick={onExportOdm}
                    disabled={isProcessing}
                    className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                    ⚛️ Export CDISC ODM (.xml)
                </button>
            </div>
        </div>
    );
};
