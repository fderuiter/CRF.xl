import * as React from 'react';
import { useState, useEffect } from 'react';
import { fetchDictionaries, insertDictionaryToActiveCell, saveNewDictionary, CodelistGroup } from '../../core/services/dictionary-service';

export const DictionarySidecar: React.FC = () => {
    const [view, setView] = useState<'loading' | 'browse' | 'create'>('loading');
    const [dictionaries, setDictionaries] = useState<CodelistGroup[]>([]);
    const [search, setSearch] = useState('');

    // New Dictionary State
    const [newId, setNewId] = useState('');
    const [newName, setNewName] = useState('');
    const [newItems, setNewItems] = useState([{ codedValue: '', decode: '' }]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setView('loading');
        const data = await fetchDictionaries();
        setDictionaries(data);
        setView('browse');
    };

    const handleUseDictionary = async (id: string) => {
        await insertDictionaryToActiveCell(id);
        // Writing to the cell will trigger a SelectionChanged event in Excel, 
        // which may slide the sidecar away depending on where the cursor moves next.
    };

    const handleSaveNew = async () => {
        if (!newId || newItems.some(i => !i.codedValue)) return;
        setView('loading');
        await saveNewDictionary(newId, newName, newItems);
        
        // Reset form & reload
        setNewId(''); setNewName(''); setNewItems([{ codedValue: '', decode: '' }]);
        await loadData();
    };

    const filteredDicts = dictionaries.filter(d => 
        d.id.toLowerCase().includes(search.toLowerCase()) || 
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right-8 duration-300 shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-emerald-900 text-white shadow-md flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">Active Context</span>
                    </div>
                    <h2 className="font-black text-lg tracking-tighter flex items-center gap-2">
                        <span>📚</span> Codelist Library
                    </h2>
                </div>
                {view === 'browse' && (
                    <button onClick={() => setView('create')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all">
                        + New
                    </button>
                )}
            </div>
            
            {/* Body */}
            <div className="flex-grow p-4 bg-slate-50 flex flex-col overflow-y-auto">
                {view === 'loading' && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center">
                        <span className="text-2xl animate-spin mb-3">⏳</span>
                        <p className="text-xs text-slate-500 font-bold">Syncing Library...</p>
                    </div>
                )}

                {view === 'browse' && (
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Search dictionaries..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        
                        <div className="space-y-3">
                            {filteredDicts.map(dict => (
                                <div key={dict.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-emerald-300 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-black text-sm text-slate-800">{dict.id}</h3>
                                            <p className="text-[10px] text-slate-500 font-medium">{dict.name}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleUseDictionary(dict.id)}
                                            className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 px-3 py-1 rounded text-[10px] font-bold transition-all"
                                        >
                                            Use
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {dict.items.slice(0, 4).map((item, idx) => (
                                            <span key={idx} className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-[9px] text-slate-600 font-medium">
                                                {item.codedValue} = {item.decode}
                                            </span>
                                        ))}
                                        {dict.items.length > 4 && <span className="px-2 py-0.5 text-[9px] text-slate-400">+{dict.items.length - 4} more</span>}
                                    </div>
                                </div>
                            ))}
                            {filteredDicts.length === 0 && (
                                <p className="text-center text-xs text-slate-400 py-4">No dictionaries found.</p>
                            )}
                        </div>
                    </div>
                )}

                {view === 'create' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <button onClick={() => setView('browse')} className="text-[10px] text-slate-500 font-bold hover:text-slate-800 flex items-center gap-1">
                            ← Back to Browse
                        </button>
                        
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Codelist ID</label>
                                <input type="text" value={newId} onChange={e => setNewId(e.target.value.toUpperCase())} placeholder="e.g. SEV_DICT" className="w-full p-2 border border-slate-200 rounded-lg text-xs uppercase" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Display Name</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Severity Scale" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                            </div>
                            
                            <div className="pt-2 border-t">
                                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Values & Decodes</label>
                                {newItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input type="text" placeholder="Value (e.g. 1)" value={item.codedValue} onChange={e => { const updated = [...newItems]; updated[idx].codedValue = e.target.value; setNewItems(updated); }} className="w-1/3 p-2 border border-slate-200 rounded-lg text-xs" />
                                        <input type="text" placeholder="Decode (e.g. Mild)" value={item.decode} onChange={e => { const updated = [...newItems]; updated[idx].decode = e.target.value; setNewItems(updated); }} className="flex-grow p-2 border border-slate-200 rounded-lg text-xs" />
                                    </div>
                                ))}
                                <button onClick={() => setNewItems([...newItems, { codedValue: '', decode: '' }])} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800">
                                    + Add Row
                                </button>
                            </div>
                        </div>

                        <button onClick={handleSaveNew} disabled={!newId || newItems.length === 0 || !newItems[0].codedValue} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50">
                            Save Dictionary
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
