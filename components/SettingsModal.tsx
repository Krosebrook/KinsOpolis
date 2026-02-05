
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { AppSettings } from '../types';

interface Props {
    settings: AppSettings;
    onUpdate: (s: AppSettings) => void;
    onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ settings, onUpdate, onClose }) => {
    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg border-8 border-slate-200 shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-4 bg-slate-200"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-slate-700 uppercase tracking-tighter">Settings</h2>
                    <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-2 font-bold transition-colors">✕</button>
                </div>
                
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Volume */}
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <div className="flex justify-between mb-3">
                            <label className="font-bold text-slate-600 text-lg">🔊 Master Volume</label>
                            <span className="font-black text-blue-500">{Math.round(settings.volume * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.1"
                            value={settings.volume}
                            onChange={(e) => onUpdate({...settings, volume: parseFloat(e.target.value)})}
                            className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                        />
                    </div>

                    {/* Ambience */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <div>
                            <div className="font-bold text-slate-700 text-lg">Background Ambience 🍃</div>
                            <div className="text-xs text-slate-400 font-bold">Wind and city sounds</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-110">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.ambience}
                                onChange={(e) => onUpdate({...settings, ambience: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-teal-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    {/* Graphics */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <div>
                            <div className="font-bold text-slate-700 text-lg">Potato Mode 🥔</div>
                            <div className="text-xs text-slate-400 font-bold">Disable shadows for speed</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-110">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.lowGraphics}
                                onChange={(e) => onUpdate({...settings, lowGraphics: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    {/* Shadow Detail */}
                    {!settings.lowGraphics && (
                        <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                            <label className="font-bold text-slate-600 mb-3 block text-lg">Shadow Detail 🌥️</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => onUpdate({...settings, shadowDetail: d})}
                                        className={`flex-1 py-3 rounded-xl font-black uppercase text-xs tracking-wider border-b-4 active:border-b-0 active:translate-y-1 transition-all ${settings.shadowDetail === d ? 'bg-slate-700 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Night Mode */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <div>
                            <div className="font-bold text-slate-700 text-lg">Night Mode 🌙</div>
                            <div className="text-xs text-slate-400 font-bold">Sleepy time</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer scale-110">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.isNight}
                                onChange={(e) => onUpdate({...settings, isNight: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    {/* Weather */}
                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                        <label className="font-bold text-slate-600 mb-3 block text-lg">Weather 🌡️</label>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {(['sunny', 'rain', 'snow'] as const).map(w => (
                                <button
                                    key={w}
                                    onClick={() => onUpdate({...settings, weather: w})}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black capitalize border-b-4 active:border-b-0 active:translate-y-1 transition-all min-w-[5rem] ${settings.weather === w ? 'bg-blue-500 text-white border-blue-700' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {w === 'sunny' ? '☀️' : w === 'rain' ? '🌧️' : '❄️'} {w}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full mt-6 bg-slate-800 text-white font-black py-4 rounded-2xl hover:bg-slate-700 transition-colors shadow-lg text-lg uppercase tracking-widest border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
                >
                    Close Settings
                </button>
            </div>
        </div>
    );
}

export default SettingsModal;
