import * as React from 'react';
import { ValidationIssue } from '../core/parser/validator';

interface ValidationLogProps {
    issues: ValidationIssue[];
    isProcessing: boolean;
}

export const ValidationLog: React.FC<ValidationLogProps> = ({ issues, isProcessing }) => {
    if (isProcessing) {
        return (
            <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center animate-pulse">
                <div className="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
                <p className="text-slate-400 text-sm font-medium">Scanning metadata...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-grow p-4 overflow-y-auto space-y-3">
                {issues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-200 rounded-full flex items-center justify-center mb-4 text-2xl">
                            ✓
                        </div>
                        <p className="text-slate-400 text-sm">
                            Click 'Run Workbook Analysis' to check your specification for errors.
                        </p>
                    </div>
                ) : (
                    issues.map((issue, idx) => (
                        <div 
                            key={idx} 
                            className={`p-4 rounded-xl border-l-4 transition-all hover:translate-x-1 ${
                                issue.level === 'Error' 
                                ? 'bg-red-50 border-red-500' 
                                : 'bg-amber-50 border-amber-500'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${
                                    issue.level === 'Error' ? 'text-red-600' : 'text-amber-600'
                                }`}>
                                    {issue.level}
                                </span>
                                {issue.location && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded-full">
                                        {issue.location}
                                    </span>
                                )}
                            </div>
                            <p className={`text-sm font-medium leading-tight ${
                                issue.level === 'Error' ? 'text-red-900' : 'text-amber-900'
                            }`}>
                                {issue.message}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
