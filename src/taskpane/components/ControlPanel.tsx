import * as React from 'react';

export const ControlPanel = ({ onInit, onDocx, onOdm, isProcessing }: any) => (
    <div className="space-y-3">
        <button onClick={onInit} disabled={isProcessing} className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold text-xs shadow-sm hover:bg-black transition-all">✨ Initialize Workbook</button>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={onDocx} disabled={isProcessing} className="bg-white text-blue-700 border border-blue-200 p-3 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 shadow-sm hover:bg-blue-50">📄 Paper CRF</button>
            <button onClick={onOdm} disabled={isProcessing} className="bg-white text-purple-700 border border-purple-200 p-3 rounded-xl font-bold text-[11px] flex flex-col items-center gap-1 shadow-sm hover:bg-purple-50">⚛️ ODM XML</button>
        </div>
    </div>
);
