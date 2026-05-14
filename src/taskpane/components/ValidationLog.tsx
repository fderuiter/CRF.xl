import * as React from 'react';
import { ValidationIssue } from '../core/parser/validator';

interface ValidationLogProps {
    issues: ValidationIssue[];
    onNavigate: (issue: ValidationIssue) => void;
}

export const ValidationLog: React.FC<ValidationLogProps> = ({ issues, onNavigate }) => {
    if (issues.length === 0) {
        return (
            <div className="flex-grow bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3 text-xl">✓</div>
                <h3 className="text-sm font-bold text-slate-800">Clean Spec</h3>
                <p className="text-[10px] text-slate-400 mt-1">Run analysis to verify metadata integrity.</p>
            </div>
        );
    }

    return (
        <div className="flex-grow flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Log Output</span>
                <span className="text-[10px] font-bold text-slate-400">{issues.length} items</span>
            </div>
            <div className="flex-grow overflow-y-auto p-2 space-y-2">
                {issues.map((issue, idx) => (
                    <div 
                        key={idx} 
                        className={`p-3 rounded-lg border-l-4 relative group transition-all ${
                            issue.level === 'Error' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'
                        }`}
                    >
                        <p className={`text-[11px] font-bold leading-tight pr-6 ${
                            issue.level === 'Error' ? 'text-red-900' : 'text-amber-900'
                        }`}>
                            {issue.message}
                        </p>
                        {issue.location && (
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-black tracking-tighter">
                                {issue.location}
                            </p>
                        )}
                        
                        {issue.rowIndex !== undefined && (
                            <button 
                                onClick={() => onNavigate(issue)}
                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-blue-600 hover:bg-white rounded transition-all"
                                title="Go to row"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
