import * as React from 'react';
import { ValidationIssue } from '../core/parser/validator';

interface ValidationLogProps {
    issues: ValidationIssue[];
    isProcessing: boolean;
}

export const ValidationLog: React.FC<ValidationLogProps> = ({ issues, isProcessing }) => {
    if (isProcessing) {
        return (
            <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Scanning Metadata...</p>
            </div>
        );
    }

    if (issues.length === 0) {
        return (
            <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mb-4 text-3xl font-black">✓</div>
                <h3 className="text-slate-800 font-bold mb-1 text-sm">Clean Specification</h3>
                <p className="text-slate-400 text-[10px] max-w-[200px] leading-tight">Referential integrity verified across all clinical sheets.</p>
            </div>
        );
    }

    const errors = issues.filter(i => i.level === 'Error');
    const warnings = issues.filter(i => i.level === 'Warning');

    return (
        <div className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex-grow overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {/* Errors Section */}
                {errors.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Critical Errors ({errors.length})
                            </span>
                        </div>
                        <div className="space-y-2">
                            {errors.map((issue, idx) => (
                                <IssueCard key={`err-${idx}`} issue={issue} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Warnings Section */}
                {warnings.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                Quality Warnings ({warnings.length})
                            </span>
                        </div>
                        <div className="space-y-2">
                            {warnings.map((issue, idx) => (
                                <IssueCard key={`warn-${idx}`} issue={issue} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const IssueCard: React.FC<{ issue: ValidationIssue }> = ({ issue }) => {
    const isError = issue.level === 'Error';
    
    return (
        <div className={`p-3 rounded-xl border-l-4 transition-all shadow-sm ${
            isError ? 'bg-white border-red-500 hover:bg-red-50/30' : 'bg-white border-amber-500 hover:bg-amber-50/30'
        }`}>
            <div className="flex justify-between items-start mb-1 gap-2">
                <p className={`text-[11px] font-bold leading-tight ${isError ? 'text-red-900' : 'text-amber-900'}`}>
                    {issue.message}
                </p>
            </div>
            
            {issue.location && (
                <div className="flex items-center gap-1.5 mt-2 opacity-60">
                    <svg className="w-2.5 h-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-full">
                        {issue.location}
                    </span>
                </div>
            )}
        </div>
    );
};
