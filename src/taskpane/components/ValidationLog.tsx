import * as React from 'react';
import { ValidationIssue } from '../core/parser/validator';

interface ValidationLogProps {
    issues: ValidationIssue[];
    onNavigate: (issue: ValidationIssue) => void;
}

/**
 * ValidationLog: The central diagnostic terminal for clinical study design.
 * Group issues by severity and provides one-click navigation to Excel sources.
 */
export const ValidationLog: React.FC<ValidationLogProps> = ({ issues, onNavigate }) => {
    if (issues.length === 0) {
        return (
            <div className="flex-grow bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mb-4 text-3xl font-black">
                    ✓
                </div>
                <h3 className="text-slate-800 font-bold mb-1 text-sm">Clean Specification</h3>
                <p className="text-slate-400 text-[11px] max-w-[200px] leading-tight">
                    Referential integrity verified across all clinical sheets. Ready for export.
                </p>
            </div>
        );
    }

    const errors = issues.filter(i => i.level === 'Error');
    const warnings = issues.filter(i => i.level === 'Warning');

    return (
        <div className="flex-grow flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Validation Log</span>
                <div className="flex gap-2">
                    {errors.length > 0 && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            {errors.length} Errors
                        </span>
                    )}
                    {warnings.length > 0 && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            {warnings.length} Warnings
                        </span>
                    )}
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                {/* Critical Errors Section */}
                {errors.length > 0 && (
                    <section>
                        <h4 className="text-[9px] font-black text-red-500 uppercase tracking-tighter mb-2 px-1">Critical Blockers</h4>
                        <div className="space-y-2">
                            {errors.map((issue, idx) => (
                                <IssueCard key={`err-${idx}`} issue={issue} onNavigate={onNavigate} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Warnings Section */}
                {warnings.length > 0 && (
                    <section>
                        <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-tighter mb-2 px-1">Quality Warnings</h4>
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

/**
 * Individual Issue Card with Navigation Trigger
 */
const IssueCard: React.FC<{ issue: ValidationIssue; onNavigate: (i: ValidationIssue) => void }> = ({ issue, onNavigate }) => {
    const isError = issue.level === 'Error';
    
    return (
        <div className={`p-3 rounded-xl border-l-4 transition-all shadow-sm group relative ${
            isError ? 'bg-white border-red-500 hover:bg-red-50/30' : 'bg-white border-amber-500 hover:bg-amber-50/30'
        }`}>
            <div className="flex justify-between items-start gap-3">
                <p className={`text-[11px] font-bold leading-tight ${isError ? 'text-red-900' : 'text-amber-900'}`}>
                    {issue.message}
                </p>
                {issue.rowIndex !== undefined && (
                    <button 
                        onClick={() => onNavigate(issue)}
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Go to Excel row"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                        </svg>
                    </button>
                )}
            </div>
            
            {issue.location && (
                <div className="flex items-center gap-1.5 mt-2">
                    <div className="bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                         <svg className="w-2 h-2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[160px]">
                            {issue.location}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
