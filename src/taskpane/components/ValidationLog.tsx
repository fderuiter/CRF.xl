import * as React from 'react';

export const ValidationLog = ({ issues, isProcessing, onNavigate }: any) => {
    if (isProcessing) return null;
    
    if (issues.length === 0) return (
        <div className="flex-grow bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-6 text-center shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2 text-2xl">✓</div>
            <h3 className="text-slate-800 font-bold mb-1 text-xs">Clean Specification</h3>
            <p className="text-slate-400 text-[10px]">No issues detected in current scope.</p>
        </div>
    );

    return (
        <div className="flex-grow bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Diagnostic Log</span>
                <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-bold">{issues.length} Issues</span>
            </div>
            <div className="flex-grow overflow-y-auto p-3 space-y-2">
                {issues.map((issue: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white border border-red-200 border-l-4 border-l-red-500 rounded-xl group relative hover:bg-red-50 transition-colors shadow-sm">
                        <p className="text-[10px] font-bold text-slate-800 pr-6 leading-tight">{issue.message}</p>
                        <p className="text-[8px] text-slate-400 mt-1 uppercase font-black">{issue.location}</p>
                        {issue.rowIndex !== undefined && (
                            <button 
                                // Map navigation accurately to the sheet where the error lives
                                onClick={() => onNavigate({ ...issue, location: issue.sheetName })} 
                                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                                🔎
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
