
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { BuildingType, CityStats, AIGoal, NewsItem, LensMode, Grid } from '../types';
import { BUILDINGS } from '../constants';
import AnalysisOverlay from './AnalysisOverlay';

interface UIOverlayProps {
  stats: CityStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  currentGoal: AIGoal | null;
  newsFeed: NewsItem[];
  onClaimReward: () => void;
  isGeneratingGoal: boolean;
  aiEnabled: boolean;
  lensMode: LensMode;
  setLensMode: (mode: LensMode) => void;
  grid: Grid;
  onOpenSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools = [
  BuildingType.None,
  BuildingType.Road,
  BuildingType.Residential,
  BuildingType.Commercial,
  BuildingType.Industrial,
  BuildingType.Park,
  BuildingType.Police,
  BuildingType.School,
];

const ToolTooltip: React.FC<{ type: BuildingType; money: number }> = ({ type, money }) => {
  const config = BUILDINGS[type];
  const canAfford = money >= config.cost;

  return (
    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 border-4 border-slate-700 shadow-2xl z-50 animate-fade-in pointer-events-none">
       <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-slate-700 translate-y-[-2px]"></div>
       <div className="text-center border-b border-white/10 pb-2 mb-2">
         <div className="font-black text-xl text-yellow-400 leading-none mb-1">{config.name}</div>
       </div>
       <div className="text-sm text-slate-200 mb-3 text-center leading-tight font-medium">
         {config.description}
       </div>
       <div className="space-y-1.5 bg-black/30 p-3 rounded-xl">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-bold">Cost</span>
            <span className={`font-black ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${config.cost}</span>
          </div>
       </div>
    </div>
  );
};

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  onHover: (type: BuildingType | null) => void;
}> = ({ type, isSelected, onClick, money, onHover }) => {
  const config = BUILDINGS[type];
  const canAfford = money >= config.cost;
  const isBulldoze = type === BuildingType.None;
  const bgColor = isBulldoze ? config.color : config.color;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={() => onHover(null)}
      disabled={!isBulldoze && !canAfford}
      className={`
        relative flex flex-col items-center justify-center rounded-2xl border-4 transition-all shadow-xl flex-shrink-0
        w-16 h-16 md:w-20 md:h-20
        ${isSelected ? 'border-white bg-yellow-400 scale-110 z-10 rotate-3' : 'border-black/20 bg-white/90 hover:bg-white hover:scale-105'}
        ${!isBulldoze && !canAfford ? 'opacity-60 grayscale' : 'cursor-pointer'}
      `}
    >
      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg mb-1 flex items-center justify-center overflow-hidden shadow-inner ring-2 ring-black/10" style={{ backgroundColor: isBulldoze ? '#fee2e2' : bgColor }}>
        {isBulldoze && <div className="text-red-500 font-black text-2xl">💣</div>}
        {type === BuildingType.Road && <div className="text-xl">🛣️</div>}
        {type === BuildingType.Police && <div className="text-xl">👮</div>}
        {type === BuildingType.School && <div className="text-xl">📚</div>}
      </div>
      <span className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-tight leading-none text-center px-1">{config.name}</span>
    </button>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  selectedTool,
  onSelectTool,
  currentGoal,
  newsFeed,
  onClaimReward,
  isGeneratingGoal,
  aiEnabled,
  lensMode,
  setLensMode,
  grid,
  onOpenSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  const [hoveredTool, setHoveredTool] = useState<BuildingType | null>(null);

  useEffect(() => {
    if (newsRef.current) newsRef.current.scrollTop = newsRef.current.scrollHeight;
  }, [newsFeed]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-6 font-sans z-10 text-slate-800">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start pointer-events-auto gap-4 w-full max-w-full">
        <div className="bg-white/95 p-3 md:p-4 rounded-3xl border-4 border-blue-400 shadow-[0_8px_0_rgb(59,130,246)] flex gap-4 md:gap-8 items-center justify-between md:justify-start w-full md:w-auto transform hover:scale-[1.02] transition-transform">
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl">💰</span>
            <span className="text-sm md:text-xl font-black text-slate-700">${stats.money.toLocaleString()}</span>
          </div>
          <div className="w-1 h-10 bg-blue-100 rounded-full"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl md:text-3xl">😊</span>
            <span className="text-sm md:text-xl font-black text-slate-700">{stats.population.toLocaleString()}</span>
          </div>
        </div>

        <div className={`w-full md:w-96 bg-indigo-600 text-white rounded-3xl border-4 border-indigo-400 shadow-[0_8px_0_rgb(99,102,241)] overflow-hidden transition-all ${!aiEnabled ? 'opacity-80 grayscale' : ''}`}>
          <div className="bg-indigo-800/50 px-4 py-2 flex justify-between items-center">
            <span className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              {aiEnabled ? <><span className={`text-xl ${isGeneratingGoal ? 'animate-spin' : 'animate-bounce'}`}>🤖</span> Robot Helper</> : "Sandbox Mode"}
            </span>
            {isGeneratingGoal && aiEnabled && <span className="text-xs font-bold text-yellow-300 animate-pulse">Thinking... 🤔</span>}
          </div>
          <div className="p-4 bg-indigo-500">
            {aiEnabled ? (currentGoal ? (
                <>
                  <p className="text-base md:text-lg font-bold text-white mb-3 leading-snug">"{currentGoal.description}"</p>
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                    <div className="text-sm font-bold text-indigo-100">
                      Goal: <span className="text-yellow-300">
                        {currentGoal.targetType === 'building_count' ? BUILDINGS[currentGoal.buildingType!].name : 
                         currentGoal.targetType === 'money' ? 'Save' : 'Pop.'} {currentGoal.targetValue}
                      </span>
                    </div>
                    <div className="text-sm font-black text-green-300 bg-green-900/40 px-3 py-1 rounded-full border border-green-400/30">+${currentGoal.reward} 🎁</div>
                  </div>
                  {currentGoal.completed && <button onClick={onClaimReward} className="mt-3 w-full bg-green-500 hover:bg-green-400 text-white font-black py-3 px-4 rounded-xl shadow-[0_4px_0_rgb(22,163,74)] active:shadow-none active:translate-y-1 transition-all text-lg uppercase tracking-wide animate-bounce">Collect Reward! 🎉</button>}
                </>
              ) : <div className="text-sm text-indigo-200 py-2 italic flex items-center gap-2">Waiting for mission... ⏳</div>) : <div className="text-sm text-indigo-200">Just build and have fun!</div>}
          </div>
        </div>
      </div>

      <AnalysisOverlay lensMode={lensMode} setLensMode={setLensMode} stats={stats} grid={grid} aiEnabled={aiEnabled} />
      
      <button onClick={onOpenSettings} className="absolute top-4 right-4 pointer-events-auto bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 active:scale-95 transition-all z-50 border-2 border-slate-600">⚙️</button>

      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-end pointer-events-auto mt-auto gap-4 w-full max-w-full">
        <div className="relative flex flex-col items-center w-full md:w-auto gap-2">
          {hoveredTool && <ToolTooltip type={hoveredTool} money={stats.money} />}
          <div className="flex gap-2 items-center">
            <div className="bg-white/90 p-2 rounded-2xl border-4 border-slate-300 shadow-xl flex gap-1">
                <button disabled={!canUndo} onClick={onUndo} className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xl">↩️</button>
                <button disabled={!canRedo} onClick={onRedo} className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xl">↪️</button>
            </div>
            <div className="bg-white/90 p-3 rounded-3xl border-4 border-slate-300 shadow-2xl w-full overflow-x-auto no-scrollbar">
                <div className="flex gap-2 min-w-max">
                {tools.map((type) => <ToolButton key={type} type={type} isSelected={selectedTool === type} onClick={() => onSelectTool(type)} money={stats.money} onHover={setHoveredTool} />)}
                </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-96 h-40 bg-orange-500 text-white rounded-3xl border-4 border-orange-400 shadow-[0_8px_0_rgb(234,88,12)] flex flex-col overflow-hidden relative">
          <div className="bg-orange-700/30 px-4 py-2 font-black text-sm uppercase tracking-wider flex justify-between items-center"><span>📰 City News</span></div>
          <div ref={newsRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-bold text-sm scroll-smooth">
            {newsFeed.length === 0 && <div className="text-orange-200/60 italic text-center mt-8">Quiet day... 🦗</div>}
            {newsFeed.map((news) => (
              <div key={news.id} className={`p-2 rounded-xl leading-tight relative shadow-sm border-2 ${news.type === 'positive' ? 'bg-green-500 border-green-400' : ''} ${news.type === 'negative' ? 'bg-red-500 border-red-400' : ''} ${news.type === 'neutral' ? 'bg-blue-500 border-blue-400' : ''}`}>{news.text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
