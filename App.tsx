
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Grid, TileData, BuildingType, CityStats, AIGoal, NewsItem } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY } from './constants';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { generateCityGoal, generateNewsEvent } from './services/geminiService';
import { loadGame, saveGame } from './services/storage';

// Lazy load the heavy 3D component
const IsoMap = lazy(() => import('./components/IsoMap'));

// Initial huge grid
const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ x, y, buildingType: BuildingType.None });
    }
    grid.push(row);
  }
  return grid;
};

// Themed loading fallback
const LoadingScreen = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-400 z-[100]">
    <div className="flex flex-col items-center animate-pulse">
      <div className="text-8xl mb-4">🏙️</div>
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
        Loading Sky Metropolis...
      </h2>
      <div className="mt-4 w-48 h-3 bg-white/30 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 animate-[loading_2s_infinite]" style={{ width: '60%' }}></div>
      </div>
    </div>
    <style>{`
      @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(200%); }
      }
    `}</style>
  </div>
);

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Load initial state or create new
  const savedData = useRef(loadGame());
  
  const [grid, setGrid] = useState<Grid>(savedData.current ? savedData.current.grid : createInitialGrid);
  const [stats, setStats] = useState<CityStats>(savedData.current ? savedData.current.stats : { money: INITIAL_MONEY, population: 0, day: 1 });
  
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(savedData.current ? savedData.current.goal : null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>(savedData.current ? savedData.current.news : []);
  const [celebrate, setCelebrate] = useState(false);
  
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);
  const newsRef = useRef(newsFeed);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { goalRef.current = currentGoal; }, [currentGoal]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);
  useEffect(() => { newsRef.current = newsFeed; }, [newsFeed]);

  // Auto-Save Loop
  useEffect(() => {
    if (!gameStarted) return;
    const saveInterval = setInterval(() => {
        saveGame({
            grid: gridRef.current,
            stats: statsRef.current,
            goal: goalRef.current,
            news: newsRef.current,
            gameStarted: true
        });
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [gameStarted]);

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed(prev => [...prev.slice(-12), item]); 
  }, []);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    await new Promise(r => setTimeout(r, 500));
    
    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) {
      setCurrentGoal(newGoal);
    } else {
      if(aiEnabledRef.current) setTimeout(fetchNewGoal, 5000);
    }
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]); 

  const fetchNews = useCallback(async () => {
    if (!aiEnabledRef.current || Math.random() > 0.15) return; 
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) addNewsItem(news);
  }, [addNewsItem]);

  useEffect(() => {
    if (!gameStarted) return;
    if (!savedData.current) {
        addNewsItem({ id: Date.now().toString(), text: "Welcome to Super City! 🌟", type: 'positive' });
        if (aiEnabled) fetchNewGoal();
    } else {
        if (!currentGoal && aiEnabled) fetchNewGoal();
    }
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      let dailyIncome = 0;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};

      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          dailyIncome += config.incomeGen;
          dailyPopGrowth += config.popGen;
          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      const resCount = buildingCounts[BuildingType.Residential] || 0;
      const maxPop = resCount * 50; 

      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > maxPop) newPop = maxPop;
        if (resCount === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5);

        const newStats = {
          money: prev.money + dailyIncome,
          population: newPop,
          day: prev.day + 1,
        };
        
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === 'money' && newStats.money >= goal.targetValue) isMet = true;
          if (goal.targetType === 'population' && newStats.population >= goal.targetValue) isMet = true;
          if (goal.targetType === 'building_count' && goal.buildingType) {
            if ((buildingCounts[goal.buildingType] || 0) >= goal.targetValue) isMet = true;
          }

          if (isMet) {
            setCurrentGoal({ ...goal, completed: true });
          }
        }

        return newStats;
      });

      fetchNews();

    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews, gameStarted]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!gameStarted) return;

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool; 
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const currentTile = currentGrid[y][x];
    const buildingConfig = BUILDINGS[tool];

    // Bulldoze
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
        } else {
            addNewsItem({id: Date.now().toString(), text: "Need more money to smash things! 💸", type: 'negative'});
        }
      }
      return;
    }

    // Build
    if (currentTile.buildingType === BuildingType.None) {
      if (currentStats.money >= buildingConfig.cost) {
        setStats(prev => ({ ...prev, money: prev.money - buildingConfig.cost }));
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[y][x] = { ...currentTile, buildingType: tool };
        setGrid(newGrid);
      } else {
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Need more money for a ${buildingConfig.name}! 💰`, type: 'negative'});
      }
    }
  }, [selectedTool, addNewsItem, gameStarted]);

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 5000); 

      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({id: Date.now().toString(), text: `Mission Complete! You got $${currentGoal.reward}! 🏆`, type: 'positive'});
      setCurrentGoal(null);
      fetchNewGoal();
    }
  };

  const handleStart = (enabled: boolean) => {
    setAiEnabled(enabled);
    setGameStarted(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent bg-sky-400">
      <Suspense fallback={<LoadingScreen />}>
        <IsoMap 
          grid={grid} 
          onTileClick={handleTileClick} 
          hoveredTool={selectedTool}
          population={stats.population}
          celebrate={celebrate}
        />
      </Suspense>
      
      {!gameStarted && (
        <StartScreen onStart={handleStart} />
      )}

      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          currentGoal={currentGoal}
          newsFeed={newsFeed}
          onClaimReward={handleClaimReward}
          isGeneratingGoal={isGeneratingGoal}
          aiEnabled={aiEnabled}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default App;
