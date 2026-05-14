import * as React from 'react';

export const ControlPanel = ({ onInit, onDocx, onOdm, isProcessing }: any) => (
    <div className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
        <button onClick={onInit} disabled={isProcessing} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">✨ Init Template</button>
        <div className="flex gap-2">
            <button onClick={onDocx} disabled={isProcessing} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">📄 Paper</button>
            <button onClick={onOdm} disabled={isProcessing} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">⚛️ ODM</button>
        </div>
    </div>
);
