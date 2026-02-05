
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { DecorationType, BuildingType, Grid, AIResponse, CityStats } from '../types';
import { PALETTE, DECORATIONS, BUILDINGS } from '../constants';

interface UIProps {
  grid: Grid;
  stats: CityStats;
  activeCategory: 'decoration' | 'building';
  setActiveCategory: (c: 'decoration' | 'building') => void;
  selectedColor: string;
  setSelectedColor: (c: string) => void;
  selectedTool: DecorationType | BuildingType;
  setSelectedTool: (t: DecorationType | BuildingType) => void;
  onMagicAction: (p: string, type: 'gen' | 'edit' | 'search' | 'maps') => void;
  onAnimate: () => void;
  onAnalyze: () => void;
  aiResponse: AIResponse | null;
  isGenerating: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenSettings: () => void;
}

interface ToolButtonProps {
  type: BuildingType;
  selected: boolean;
  onClick: () => void;
  money: number;
}

const ToolButton: React.FC<ToolButtonProps> = ({ type, selected, onClick, money }) => {
    if (type === BuildingType.None) {
        return (
            <button
                onClick={onClick}
                className={`group relative flex flex-col items-center justify-center min-w-[5.5rem] h-24 rounded-[2rem] transition-all ${
                    selected
                    ? 'bg-red-500 text-white scale-110 shadow-lg border-4 border-white' 
                    : 'bg-red-500/20 text-red-200 hover:bg-red-500/40'
                }`}
            >
                <span className="text-4xl">🚜</span>
                <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">Bulldoze</span>
                <div className="absolute top-2 right-2 bg-red-700 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">B</div>
            </button>
        );
    }

    const info = BUILDINGS[type];
    const canAfford = money >= info.cost;

    return (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center min-w-[5.5rem] h-24 rounded-[2rem] transition-all ${
                selected 
                ? 'bg-white text-slate-800 scale-110 shadow-lg border-4 border-yellow-300' 
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            } ${!canAfford ? 'opacity-70 grayscale-[0.5]' : ''}`}
        >
            <span className="text-3xl">{info.icon}</span>
            <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{info.name}</span>
            <span className={`text-[10px] font-bold px-2 rounded-full mt-1 ${canAfford ? 'text-yellow-400 bg-slate-800' : 'text-red-300 bg-red-900/50'}`}>${info.cost}</span>
            
            {/* Shortcut Hint */}
            {type === BuildingType.Road && <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">R</div>}
            {type === BuildingType.Residential && <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">1</div>}
            {type === BuildingType.Commercial && <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">2</div>}
            {type === BuildingType.Industrial && <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">3</div>}
            {type === BuildingType.Park && <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100">4</div>}

            {/* Enhanced Tooltip */}
            <div className="absolute bottom-full mb-4 hidden group-hover:block w-56 bg-slate-900/95 text-white p-4 rounded-2xl border-4 border-slate-700 backdrop-blur-xl shadow-2xl z-50 animate-fade-in-up pointer-events-none">
                <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                    <span className="font-black text-yellow-400 text-lg">{info.name}</span>
                    <span className={`font-mono font-bold ${canAfford ? 'text-green-400' : 'text-red-500'}`}>${info.cost}</span>
                </div>
                
                <div className="text-xs text-slate-300 mb-3 italic leading-relaxed">
                    {info.desc}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 rounded-xl p-2 text-center border border-slate-600">
                        <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider mb-0.5">Citizens</div>
                        <div className="font-black text-blue-400 text-sm">+{info.pop}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-2 text-center border border-slate-600">
                        <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider mb-0.5">Income</div>
                        <div className="font-black text-green-400 text-sm">+${info.income}</div>
                    </div>
                </div>

                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] border-8 border-transparent border-t-slate-700"></div>
            </div>
        </button>
    );
};

const UIOverlay: React.FC<UIProps> = ({ 
  stats, activeCategory, setActiveCategory,
  selectedColor, setSelectedColor, 
  selectedTool, setSelectedTool,
  onMagicAction, onAnimate, onAnalyze, aiResponse,
  isGenerating, onUndo, onRedo, canUndo, canRedo, onOpenSettings
}) => {
  const [prompt, setPrompt] = useState("");
  const [magicMode, setMagicMode] = useState<'gen' | 'edit' | 'search' | 'maps'>('gen');

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* Top Bar - Magic Tools & Stats */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-4 max-w-xl w-full">
            {/* Stats Card */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-[2rem] p-3 shadow-xl border-4 border-yellow-300 flex items-center justify-around">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <span className="font-black text-slate-700 text-xl">${stats.money}</span>
                </div>
                <div className="w-1 h-8 bg-slate-100 rounded-full"></div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">👥</span>
                    <span className="font-black text-slate-700 text-xl">{stats.population}</span>
                </div>
                <div className="w-1 h-8 bg-slate-100 rounded-full"></div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onUndo} 
                        disabled={!canUndo}
                        className={`text-2xl transition-all ${!canUndo ? 'opacity-30' : 'hover:scale-110 active:scale-95 text-blue-500'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        ↩️
                    </button>
                    <button 
                        onClick={onRedo} 
                        disabled={!canRedo}
                        className={`text-2xl transition-all ${!canRedo ? 'opacity-30' : 'hover:scale-110 active:scale-95 text-blue-500'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        ↪️
                    </button>
                </div>
            </div>

            {/* Magic Tools */}
            <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-[2.5rem] p-3 shadow-2xl border-4 border-cyan-200 flex flex-col gap-3">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-[2rem]">
                {[
                { id: 'gen', label: 'Create', icon: '🎨' },
                { id: 'edit', label: 'Edit', icon: '✨' },
                { id: 'search', label: 'Search', icon: '🔍' },
                { id: 'maps', label: 'Places', icon: '📍' }
                ].map(mode => (
                <button
                    key={mode.id}
                    onClick={() => setMagicMode(mode.id as any)}
                    className={`flex-1 py-2 px-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-tighter flex items-center justify-center gap-1 transition-all ${magicMode === mode.id ? 'bg-cyan-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                    <span>{mode.icon}</span> {mode.label}
                </button>
                ))}
            </div>
            <div className="flex gap-2 items-center px-2 pb-1">
                <input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                    magicMode === 'gen' ? "Imagine something..." :
                    magicMode === 'edit' ? "Change something..." :
                    magicMode === 'search' ? "Ask a question..." : "Find a place..."
                }
                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-400 px-2"
                />
                <button 
                onClick={() => onMagicAction(prompt, magicMode)}
                disabled={isGenerating || !prompt}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-black px-6 py-2 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                GO
                </button>
            </div>
            </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onOpenSettings}
            className="pointer-events-auto bg-slate-800 hover:bg-slate-700 text-white rounded-3xl p-5 shadow-xl border-4 border-slate-600 flex flex-col items-center group transition-all active:scale-95"
          >
             <span className="text-3xl mb-1 group-hover:rotate-90 transition-transform duration-500">⚙️</span>
          </button>

          <button 
            onClick={onAnalyze}
            className="pointer-events-auto bg-pink-500 hover:bg-pink-600 text-white rounded-3xl p-5 shadow-xl border-4 border-pink-200 flex flex-col items-center group transition-all"
          >
            <span className="text-3xl mb-1 group-hover:scale-125 transition-transform">👁️</span>
            <span className="font-black text-[10px] uppercase">Analyze</span>
          </button>
          
          <button 
            onClick={onAnimate}
            className="pointer-events-auto bg-indigo-500 hover:bg-indigo-600 text-white rounded-3xl p-5 shadow-xl border-4 border-indigo-200 flex flex-col items-center group transition-all animate-pulse"
          >
            <span className="text-3xl mb-1 group-hover:rotate-12 transition-transform">🎬</span>
            <span className="font-black text-[10px] uppercase">Animate</span>
          </button>
        </div>
      </div>

      {/* Center - Grounded Response Panel */}
      {aiResponse && (
        <div className="pointer-events-auto self-center bg-white/95 rounded-[2.5rem] p-8 border-8 border-pink-200 shadow-2xl max-w-2xl w-full transform hover:scale-[1.02] transition-transform flex flex-col gap-4">
          <p className="text-lg font-bold text-slate-800 leading-relaxed italic text-center">
            "{aiResponse.text}"
          </p>
          {aiResponse.groundingChunks && aiResponse.groundingChunks.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center border-t pt-4 mt-2">
              <span className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sources</span>
              {aiResponse.groundingChunks.map((chunk, i) => {
                const source = chunk.web || chunk.maps;
                if (!source) return null;
                return (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-cyan-50 hover:bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-xs font-bold border border-cyan-200 transition-colors"
                  >
                    🔗 {source.title}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Bar - Tools */}
      <div className="flex flex-col gap-6 items-center">
        {/* Mode Switcher */}
        <div className="pointer-events-auto flex bg-white/90 backdrop-blur p-2 rounded-[2rem] shadow-2xl border-4 border-white gap-2">
            <button
                onClick={() => { setActiveCategory('decoration'); setSelectedTool(DecorationType.Flower); }}
                className={`px-6 py-3 rounded-[1.5rem] font-black text-sm uppercase flex items-center gap-2 transition-all ${activeCategory === 'decoration' ? 'bg-pink-400 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <span>🎨</span> Paint
            </button>
            <button
                onClick={() => { setActiveCategory('building'); setSelectedTool(BuildingType.Road); }}
                className={`px-6 py-3 rounded-[1.5rem] font-black text-sm uppercase flex items-center gap-2 transition-all ${activeCategory === 'building' ? 'bg-yellow-400 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <span>🏗️</span> Build
            </button>
        </div>

        {activeCategory === 'decoration' && (
            <div className="flex flex-col gap-4 items-center animate-fade-in-up">
                <div className="pointer-events-auto flex gap-3 bg-white/90 backdrop-blur p-4 rounded-[3rem] shadow-2xl border-4 border-white overflow-x-auto max-w-full no-scrollbar">
                {PALETTE.map(color => (
                    <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`min-w-[3rem] h-12 rounded-full border-4 transition-all ${selectedColor === color ? 'border-slate-800 scale-125 z-10' : 'border-white hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    />
                ))}
                </div>

                <div className="pointer-events-auto flex gap-4 bg-slate-800/80 backdrop-blur p-4 rounded-[2.5rem] shadow-2xl overflow-x-auto max-w-full no-scrollbar">
                {(Object.keys(DECORATIONS) as DecorationType[]).map(type => (
                    <button
                    key={type}
                    onClick={() => setSelectedTool(type)}
                    className={`flex flex-col items-center justify-center min-w-[5.5rem] h-24 rounded-[2rem] transition-all ${
                        selectedTool === type 
                        ? 'bg-white text-slate-800 scale-110 shadow-lg' 
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                    >
                    <span className="text-4xl">{DECORATIONS[type].icon}</span>
                    <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{DECORATIONS[type].name}</span>
                    </button>
                ))}
                </div>
            </div>
        )}

        {activeCategory === 'building' && (
             <div className="pointer-events-auto flex gap-4 bg-slate-800/80 backdrop-blur p-4 rounded-[2.5rem] shadow-2xl overflow-x-auto max-w-full no-scrollbar animate-fade-in-up pb-8">
                 {/* ToolButtons */}
                 {(Object.keys(BUILDINGS) as BuildingType[]).map(type => (
                     <ToolButton 
                        key={type}
                        type={type}
                        selected={selectedTool === type}
                        onClick={() => setSelectedTool(type)}
                        money={stats.money}
                     />
                 ))}
             </div>
        )}
      </div>
    </div>
  );
};

export default UIOverlay;
