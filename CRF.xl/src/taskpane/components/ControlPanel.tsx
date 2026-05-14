import * as React from 'react';

interface ControlPanelProps {
    onRunAnalysis: () => Promise<void>;
    isProcessing: boolean;
    studyLoaded: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onRunAnalysis, isProcessing, studyLoaded }) => {
    return (
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-3">
                <button 
                    onClick={onRunAnalysis}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Analyzing...
                        </>
                    ) : "Run Workbook Analysis"}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        disabled={!studyLoaded || isProcessing}
                        className="bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors"
                    >
                        📄 Export Paper
                    </button>
                    <button 
                        disabled={!studyLoaded || isProcessing}
                        className="bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors"
                    >
                        ⚛️ Export ODM
                    </button>
                </div>
            </div>
        </div>
    );
};
