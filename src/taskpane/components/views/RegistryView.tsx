import * as React from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { BuildingRegular, SparkleRegular, ArrowSyncRegular } from '@fluentui/react-icons';

interface RegistryProps {
    onInit: () => Promise<void>;
    onSync: () => Promise<void>;
    isProcessing: boolean;
}

export const RegistryView: React.FC<RegistryProps> = ({ onInit, onSync, isProcessing }) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            
            <div className="flex items-center gap-2 mb-2">
                <BuildingRegular fontSize={24} />
                <h2 className="font-black text-base tracking-tight">System Registry</h2>
            </div>
            
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Define your global protocol and register your forms here. Sync to generate authoring tabs.
            </p>
            
            <div className="space-y-3 relative z-10">
                <Button
                    appearance="transparent"
                    onClick={onInit} 
                    disabled={isProcessing} 
                    icon={isProcessing ? <Spinner size="tiny" /> : <SparkleRegular />}
                    className="w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between group disabled:opacity-50"
                >
                    <div className="flex-grow flex justify-between items-center w-full">
                        <span>Initialize Canvas</span>
                        <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Button>
                
                <Button
                    appearance="primary"
                    onClick={onSync} 
                    disabled={isProcessing} 
                    icon={isProcessing ? <Spinner size="tiny" /> : <ArrowSyncRegular />}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-between group disabled:opacity-50"
                >
                    <div className="flex-grow flex justify-between items-center w-full">
                        <span>Sync Form Sheets</span>
                        <span className="text-blue-200 group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </Button>
            </div>
        </div>
    </div>
);
