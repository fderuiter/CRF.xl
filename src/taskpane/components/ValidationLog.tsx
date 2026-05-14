import * as React from 'react';
import { ValidationIssue } from '../core/parser/validator';

interface ValidationLogProps {
    issues: ValidationIssue[];
    isProcessing: boolean;
    onNavigate: (issue: ValidationIssue) => Promise<void>;
}

export const ValidationLog: React.FC<ValidationLogProps> = ({ issues, isProcessing, onNavigate }) => {
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
                <p className="text-slate-400 text-[10px] max-w-[200px] leading-tight text-center">Referential integrity verified. No blockers found.</p>
            </div>
        );
    }

    const errors = issues.filter(i => i.level === 'Error');
    const warnings = issues.filter(i => i.level === 'Warning');

    return (
        <div className="flex-grow flex flex-col gap-4 overflow-hidden">
            <div className="flex gap-2 mb-1 px-1">
                <div className="flex-1 bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Issue Summary</span>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-700">{errors.length} Errors</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-700">{warnings.length} Warnings</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                {errors.length > 0 && (
                    <section>
                        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm py-1 mb-2">
                            <span className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Blockers</span>
                        </div>
                        <div className="space-y-2">
                            {errors.map((issue, idx) => (
                                <IssueCard key={`err-${idx}`} issue={issue} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </section>
                )}

                {warnings.length > 0 && (
                    <section>
                        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm py-1 mb-2">
                            <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Quality</span>
                        </div>
                        <div className="space-y-2">
                            {warnings.map((issue, idx) => (
                                <IssueCard key={`warn-${idx}`} issue={issue} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const IssueCard: React.FC<{ issue: ValidationIssue, onNavigate: (i: ValidationIssue) => Promise<void> }> = ({ issue, onNavigate }) => {
    const isError = issue.level === 'Error';
    const breadcrumbs = issue.location?.split(' > ') || [];

    return (
        <div className={`p-3 rounded-xl border-l-4 transition-all shadow-sm group relative ${
            isError ? 'bg-white border-red-500 hover:bg-red-50/30' : 'bg-white border-amber-500 hover:bg-amber-50/30'
        }`}>
            <p className={`text-[11px] font-bold leading-tight pr-8 ${isError ? 'text-red-900' : 'text-amber-900'}`}>
                {issue.message}
            </p>
            
            <button 
                onClick={() => onNavigate(issue)}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                title="Go to Excel Source"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            </button>
            
            {issue.location && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-[8px] text-slate-300">/</span>}
                            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{crumb}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};
