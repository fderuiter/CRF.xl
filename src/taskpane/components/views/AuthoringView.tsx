import * as React from 'react';
import { insertDateBlock, insertAEBlock } from '../../core/services/authoring-service';

interface AuthoringProps {
    sheetName: string;
    onValidate: () => void;
    isProcessing: boolean;
}

export const AuthoringView: React.FC<AuthoringProps> = ({ sheetName, onValidate, isProcessing }) => {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
                <h2 className="font-black text-blue-900 text-base mb-1 tracking-tight flex items-center gap-2">
                    <span className="text-xl">📝</span> Authoring: {sheetName}
                </h2>
                <p className="text-xs text-blue-600/80 mb-5 font-medium">Context-aware tools for this form.</p>

                <div className="space-y-2">
                    <button
                        onClick={insertDateBlock}
                        className="w-full bg-white border border-blue-200 text-blue-700 p-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all text-left flex items-center justify-between shadow-sm active:scale-95"
                    >
                        <span className="flex items-center gap-2"><span className="text-blue-400">📅</span> Insert Date Group</span>
                        <span className="opacity-50 text-[10px]">CDISC</span>
                    </button>
                    <button
                        onClick={insertAEBlock}
                        className="w-full bg-white border border-blue-200 text-blue-700 p-3 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all text-left flex items-center justify-between shadow-sm active:scale-95"
                    >
                        <span className="flex items-center gap-2"><span className="text-blue-400">⚠️</span> Insert AE Block</span>
                        <span className="opacity-50 text-[10px]">Log</span>
                    </button>
                </div>
            </div>

            <button
                onClick={onValidate}
                disabled={isProcessing}
                className="w-full bg-white border-2 border-slate-900 text-slate-900 p-3 rounded-xl font-black text-xs hover:bg-slate-900 hover:text-white transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
            >
                <span>🔍</span> Validate {sheetName}
            </button>
        </div>
    );
};
