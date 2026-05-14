import * as React from 'react';

export const ValidationLog = ({ issues, onNavigate }: any) => {
    if (issues.length === 0) return (
        <div className="flex-grow bg-white rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center">
            <p className="text-slate-400 text-xs font-medium italic">Run analysis to see results.</p>
        </div>
    );
    return (
        <div className="flex-grow bg-white rounded-xl border overflow-hidden flex flex-col">
            <div className="p-2 bg-slate-50 border-b text-[9px] font-black uppercase text-slate-500 tracking-tighter">Analysis Log</div>
            <div className="flex-grow overflow-y-auto p-2 space-y-2">
                {issues.map((issue: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 relative group ${issue.level === 'Error' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                        <p className="text-[11px] font-bold text-slate-800 pr-6">{issue.message}</p>
                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-tighter">{issue.location}</p>
                        {issue.rowIndex !== undefined && (
                            <button onClick={() => onNavigate(issue)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-blue-600 font-bold" title="Inspect">🔎</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
