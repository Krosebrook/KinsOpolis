
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { SaveMetadata } from '../types';
import { getSaveSlots, createSaveSlot, deleteSaveSlot } from '../services/storage';
import { audio } from '../services/audio';

interface StartScreenProps {
  onStart: (slotId: string, aiEnabled: boolean) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [slots, setSlots] = useState<SaveMetadata[]>([]);
  const [view, setView] = useState<'main' | 'slots' | 'new'>('main');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setSlots(getSaveSlots());
  }, [view]);

  const handleStart = (slotId: string) => {
    audio.init();
    audio.resume();
    audio.playClick();
    onStart(slotId, aiEnabled);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = createSaveSlot(newName);
    handleStart(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this city forever?")) {
        deleteSaveSlot(id);
        setSlots(getSaveSlots());
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-6 bg-black/40 backdrop-blur-sm transition-all font-sans">
      <div className="max-w-lg w-full bg-white p-8 rounded-[3rem] border-8 border-cyan-400 shadow-[0_20px_0_rgba(34,211,238,0.4)] relative overflow-hidden animate-fade-in">
        
        <div className="relative z-10 text-center">
            <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 drop-shadow-sm tracking-tighter">
              Super City
            </h1>
            <p className="text-slate-500 mb-8 text-xl font-bold uppercase tracking-widest">
              Builder 3000
            </p>

            {view === 'main' && (
                <div className="space-y-4">
                    <button 
                        onClick={() => { setView('new'); audio.playClick(); }}
                        className="w-full py-4 bg-gradient-to-b from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-white font-black rounded-2xl shadow-[0_6px_0_rgb(22,163,74)] active:shadow-none active:translate-y-2 transform transition-all text-xl uppercase tracking-wide border-2 border-green-200"
                    >
                        New City 🏗️
                    </button>
                    <button 
                        onClick={() => { setView('slots'); audio.playClick(); }}
                        className="w-full py-4 bg-gradient-to-b from-blue-400 to-blue-500 hover:from-blue-300 hover:to-blue-400 text-white font-black rounded-2xl shadow-[0_6px_0_rgb(37,99,235)] active:shadow-none active:translate-y-2 transform transition-all text-xl uppercase tracking-wide border-2 border-blue-200"
                    >
                        Load City 📂
                    </button>
                    
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <label className="flex items-center justify-center gap-3 cursor-pointer group select-none">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={aiEnabled}
                                onChange={(e) => setAiEnabled(e.target.checked)}
                            />
                            <div className="w-12 h-7 bg-slate-300 rounded-full peer peer-focus:ring-4 peer-focus:ring-cyan-300 peer-checked:after:translate-x-full after:content-[''] after:absolute after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:mt-1 after:ml-1 peer-checked:bg-indigo-500 shadow-inner"></div>
                            <span className="font-bold text-slate-500 peer-checked:text-indigo-600 transition-colors">Enable Robot Helper 🤖</span>
                        </label>
                    </div>
                </div>
            )}

            {view === 'slots' && (
                <div className="space-y-3">
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {slots.length === 0 && <p className="text-slate-400 italic py-4">No saved cities yet.</p>}
                        {slots.map(slot => (
                            <div key={slot.id} onClick={() => handleStart(slot.id)} className="group bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-300 p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all text-left">
                                <div>
                                    <div className="font-black text-slate-700 group-hover:text-blue-600">{slot.name}</div>
                                    <div className="text-xs text-slate-400 font-bold">Pop: {slot.population} • ${slot.money}</div>
                                </div>
                                <button onClick={(e) => handleDelete(e, slot.id)} className="text-slate-300 hover:text-red-500 p-2">🗑️</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setView('main')} className="text-slate-400 font-bold hover:text-slate-600 text-sm mt-4">← Back</button>
                </div>
            )}

            {view === 'new' && (
                <form onSubmit={handleCreate} className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="City Name..." 
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full text-center text-2xl font-black bg-slate-100 border-b-4 border-slate-300 focus:border-cyan-400 outline-none p-3 rounded-xl text-slate-700 placeholder:text-slate-300"
                        maxLength={20}
                    />
                    <button 
                        type="submit"
                        className="w-full py-4 bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-yellow-900 font-black rounded-2xl shadow-[0_6px_0_rgb(202,138,4)] active:shadow-none active:translate-y-2 transform transition-all text-xl uppercase tracking-wide border-2 border-yellow-200"
                    >
                        Create & Play!
                    </button>
                    <button type="button" onClick={() => setView('main')} className="text-slate-400 font-bold hover:text-slate-600 text-sm">Cancel</button>
                </form>
            )}

        </div>
      </div>
    </div>
  );
};

export default StartScreen;
