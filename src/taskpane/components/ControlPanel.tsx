import * as React from 'react';

interface ControlPanelProps {
    onInit: () => Promise<void>;
    onDocx: () => Promise<void>;
    onOdm: () => Promise<void>;
    isProcessing: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onInit, onDocx, onOdm, isProcessing }) => {
    return (
        <div className="space-y-3">
            <button 
                onClick={onInit}
                disabled={isProcessing}
                className="w-full bg-slate-900 hover:bg-black text-white p-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
                ✨ Initialize Workbook
            </button>
            
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={onDocx}
                    disabled={isProcessing}
                    className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 p-3 rounded-xl font-bold text-[11px] transition-all shadow-sm flex flex-col items-center gap-1"
                >
                    <span className="text-lg">📄</span>
                    Paper CRF
                </button>
                <button 
                    onClick={onOdm}
                    disabled={isProcessing}
                    className="bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 p-3 rounded-xl font-bold text-[11px] transition-all shadow-sm flex flex-col items-center gap-1"
                >
                    <span className="text-lg">⚛️</span>
                    ODM XML
                </button>
            </div>
        </div>
    );
};
