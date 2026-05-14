import * as React from 'react';

export const DictionarySidecar: React.FC = () => (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right-8 duration-300 border-l border-slate-200 shadow-2xl">
        <div className="p-5 bg-emerald-900 text-white">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Active Context</span>
            </div>
            <h2 className="font-black text-xl tracking-tighter flex items-center gap-2">
                <span>📚</span> Dictionary Sidecar
            </h2>
            <p className="text-xs text-emerald-200/80 mt-1">Select or create a codelist for this cell.</p>
        </div>
        
        <div className="flex-grow p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                <span className="text-2xl animate-pulse">⏳</span>
            </div>
            <p className="text-sm text-slate-600 font-bold mb-2">Codelist Browser Loading...</p>
            <p className="text-xs text-slate-400 max-w-[200px]">
                This UI will populate with your _Codelists data in Phase 3. Click any other cell to close.
            </p>
        </div>
    </div>
);
