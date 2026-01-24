
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md border-4 border-slate-300 shadow-2xl">
                <h2 className="text-2xl font-black text-slate-700 mb-6 text-center uppercase tracking-wide">Settings</h2>
                
                <div className="space-y-6">
                    {/* Volume */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="font-bold text-slate-600">Sound Volume</label>
                            <span className="font-bold text-slate-400">{Math.round(settings.volume * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="1" step="0.1"
                            value={settings.volume}
                            onChange={(e) => onUpdate({...settings, volume: parseFloat(e.target.value)})}
                            className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    {/* Graphics */}
                    <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                        <div>
                            <div className="font-bold text-slate-700">Potato Mode 🥔</div>
                            <div className="text-xs text-slate-400">Disable shadows for speed</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.lowGraphics}
                                onChange={(e) => onUpdate({...settings, lowGraphics: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    {/* Shadow Detail */}
                    {!settings.lowGraphics && (
                        <div>
                            <label className="font-bold text-slate-600 mb-2 block">Shadow Detail</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => onUpdate({...settings, shadowDetail: d})}
                                        className={`flex-1 py-2 rounded-xl font-bold capitalize border-2 ${settings.shadowDetail === d ? 'bg-slate-700 text-white border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Night Mode */}
                    <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                        <div>
                            <div className="font-bold text-slate-700">Night Mode 🌙</div>
                            <div className="text-xs text-slate-400">Sleepy time</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.isNight}
                                onChange={(e) => onUpdate({...settings, isNight: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>

                    {/* Weather */}
                    <div>
                        <label className="font-bold text-slate-600 mb-2 block">Weather</label>
                        <div className="flex gap-2">
                            {(['sunny', 'rain', 'snow'] as const).map(w => (
                                <button
                                    key={w}
                                    onClick={() => onUpdate({...settings, weather: w})}
                                    className={`flex-1 py-2 rounded-xl font-bold capitalize border-2 ${settings.weather === w ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                >
                                    {w === 'sunny' ? '☀️' : w === 'rain' ? '🌧️' : '❄️'} {w}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full mt-8 bg-slate-800 text-white font-black py-3 rounded-xl hover:bg-slate-700 transition-colors shadow-lg"
                >
                    Done
                </button>
            </div>
        </div>
    );
}

export default SettingsModal;
