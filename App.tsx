
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Grid, TileData, BuildingType, CityStats, AIGoal, NewsItem, LensMode, AppSettings, Citizen } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY } from './constants';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import SettingsModal from './components/SettingsModal';
import CitizenModal from './components/CitizenModal';
import { generateCityGoal, generateNewsEvent } from './services/geminiService';
import { loadGame, saveGame } from './services/storage';
import { audio } from './services/audio';
import { computeLandValueMap } from './services/analytics';

const IsoMap = lazy(() => import('./components/IsoMap'));

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

const LoadingScreen = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-400 z-[100]">
    <div className="flex flex-col items-center animate-pulse">
      <div className="text-8xl mb-4">🏙️</div>
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Loading Sky Metropolis...</h2>
    </div>
  </div>
);

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [saveSlotId, setSaveSlotId] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>({ money: INITIAL_MONEY, population: 0, day: 1 });
  const [history, setHistory] = useState<{grid: Grid, stats: CityStats}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  const [lensMode, setLensMode] = useState<LensMode>(LensMode.None);
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  
  // Settings with defaults
  const [settings, setSettings] = useState<AppSettings>({ 
      volume: 0.5, 
      lowGraphics: false, 
      shadowDetail: 'medium',
      showTutorial: true,
      weather: 'sunny',
      isNight: false 
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [celebrate, setCelebrate] = useState(false);
  
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);
  const newsRef = useRef(newsFeed);
  const saveIdRef = useRef(saveSlotId);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { goalRef.current = currentGoal; }, [currentGoal]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);
  useEffect(() => { newsRef.current = newsFeed; }, [newsFeed]);
  useEffect(() => { saveIdRef.current = saveSlotId; }, [saveSlotId]);

  useEffect(() => { audio.setVolume(settings.volume); }, [settings.volume]);

  useEffect(() => {
    if (!gameStarted || !saveSlotId) return;
    const saveInterval = setInterval(() => {
        saveGame(saveSlotId, {
            grid: gridRef.current,
            stats: statsRef.current,
            goal: goalRef.current,
            news: newsRef.current,
            gameStarted: true
        });
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [gameStarted, saveSlotId]);

  const addNewsItem = useCallback((item: NewsItem) => setNewsFeed(prev => [...prev.slice(-12), item]), []);

  const pushHistory = (newGrid: Grid, newStats: CityStats) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ grid: newGrid, stats: newStats });
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const performUndo = () => {
    if (historyIndex > 0) {
        const prev = history[historyIndex - 1];
        setGrid(prev.grid);
        setStats(prev.stats);
        setHistoryIndex(historyIndex - 1);
        audio.playClick();
    } else audio.playError();
  };

  const performRedo = () => {
    if (historyIndex < history.length - 1) {
        const next = history[historyIndex + 1];
        setGrid(next.grid);
        setStats(next.stats);
        setHistoryIndex(historyIndex + 1);
        audio.playClick();
    }
  };

  useEffect(() => {
    if (!gameStarted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showSettings) return;
        switch(e.key.toLowerCase()) {
            case 'z': if (e.metaKey || e.ctrlKey) (e.shiftKey ? performRedo() : performUndo()); break;
            case 'y': if (e.metaKey || e.ctrlKey) performRedo(); break;
            case 'escape': setSelectedTool(BuildingType.None); setLensMode(LensMode.None); setSelectedCitizen(null); break;
            case 'b': setSelectedTool(BuildingType.None); break;
            case 'r': setSelectedTool(BuildingType.Road); break;
            case '1': setSelectedTool(BuildingType.Residential); break;
            case '2': setSelectedTool(BuildingType.Commercial); break;
            case '3': setSelectedTool(BuildingType.Industrial); break;
            case '4': setSelectedTool(BuildingType.Park); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, history, historyIndex, showSettings]);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    await new Promise(r => setTimeout(r, 500));
    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) setCurrentGoal(newGoal);
    else if(aiEnabledRef.current) setTimeout(fetchNewGoal, 5000);
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]); 

  const fetchNews = useCallback(async () => {
    if (!aiEnabledRef.current || Math.random() > 0.15) return; 
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) addNewsItem(news);
  }, [addNewsItem]);

  const handleStart = (slotId: string, enabled: boolean) => {
    setAiEnabled(enabled);
    setSaveSlotId(slotId);
    
    // Start Ambience
    audio.startAmbience();

    const saved = loadGame(slotId);
    if (saved) {
        setGrid(saved.grid);
        setStats(saved.stats);
        setCurrentGoal(saved.goal);
        setNewsFeed(saved.news);
        setHistory([{ grid: saved.grid, stats: saved.stats }]);
        setHistoryIndex(0);
    } else {
        const initialGrid = createInitialGrid();
        const initialStats = { money: INITIAL_MONEY, population: 0, day: 1 };
        setGrid(initialGrid);
        setStats(initialStats);
        setHistory([{ grid: initialGrid, stats: initialStats }]);
        setHistoryIndex(0);
        addNewsItem({ id: Date.now().toString(), text: "Welcome to Super City! 🌟", type: 'positive' });
        if (enabled) fetchNewGoal();
    }
    setGameStarted(true);
  };

  useEffect(() => {
    if (gameStarted && !currentGoal && aiEnabled) fetchNewGoal();
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      let dailyIncome = 0;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};
      let needsGridUpdate = false;
      const newGrid = gridRef.current.map(row => row.map(t => ({...t}))); // Deep copy for mutation

      // Compute land value for upgrades only once per tick
      const landValueMap = computeLandValueMap(gridRef.current);

      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          dailyIncome += config.incomeGen;
          dailyPopGrowth += config.popGen;
          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;

          // Building Upgrade Logic
          if (tile.buildingType === BuildingType.Residential) {
              const lv = landValueMap[tile.y * GRID_SIZE + tile.x];
              const currentLevel = tile.level || 1;
              if (currentLevel < 3 && lv > 0.8 && Math.random() < 0.05) {
                  // Upgrade!
                  newGrid[tile.y][tile.x].level = currentLevel + 1;
                  needsGridUpdate = true;
                  dailyIncome += 10; // Bonus tax
              }
          }
        }
      });

      const resCount = buildingCounts[BuildingType.Residential] || 0;
      const maxPop = resCount * 50; 

      if (needsGridUpdate) {
          setGrid(newGrid);
          addNewsItem({ id: Date.now().toString(), text: "Buildings are upgrading due to high land value! 📈", type: 'positive' });
      }

      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > maxPop) newPop = maxPop;
        if (resCount === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5);

        const newStats = { money: prev.money + dailyIncome, population: newPop, day: prev.day + 1 };
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === 'money' && newStats.money >= goal.targetValue) isMet = true;
          if (goal.targetType === 'population' && newStats.population >= goal.targetValue) isMet = true;
          if (goal.targetType === 'building_count' && goal.buildingType && (buildingCounts[goal.buildingType] || 0) >= goal.targetValue) isMet = true;
          if (isMet) setCurrentGoal({ ...goal, completed: true });
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

    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None, level: 1 };
            const newStats = { ...currentStats, money: currentStats.money - demolishCost };
            setGrid(newGrid);
            setStats(newStats);
            pushHistory(newGrid, newStats);
            audio.playBulldoze();
        } else {
            addNewsItem({id: Date.now().toString(), text: "Need more money to smash things! 💸", type: 'negative'});
            audio.playError();
        }
      }
      return;
    }

    if (currentTile.buildingType === BuildingType.None) {
      if (currentStats.money >= buildingConfig.cost) {
        const newStats = { ...currentStats, money: currentStats.money - buildingConfig.cost };
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[y][x] = { ...currentTile, buildingType: tool, level: 1 };
        setStats(newStats);
        setGrid(newGrid);
        pushHistory(newGrid, newStats);
        audio.playBuild();
      } else {
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Need more money for a ${buildingConfig.name}! 💰`, type: 'negative'});
        audio.playError();
      }
    }
  }, [selectedTool, addNewsItem, gameStarted, history, historyIndex]);

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setCelebrate(true);
      audio.playCash();
      setTimeout(() => setCelebrate(false), 5000); 
      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({id: Date.now().toString(), text: `Mission Complete! You got $${currentGoal.reward}! 🏆`, type: 'positive'});
      setCurrentGoal(null);
      fetchNewGoal();
    }
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
          lensMode={lensMode}
          settings={settings}
          onCitizenClick={(c) => {
              setSelectedCitizen(c);
              audio.playClick();
          }}
        />
      </Suspense>
      {!gameStarted && <StartScreen onStart={handleStart} />}
      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={(t) => { setSelectedTool(t); audio.playClick(); }}
          currentGoal={currentGoal}
          newsFeed={newsFeed}
          onClaimReward={handleClaimReward}
          isGeneratingGoal={isGeneratingGoal}
          aiEnabled={aiEnabled}
          lensMode={lensMode}
          setLensMode={(l) => { setLensMode(l); audio.playClick(); }}
          grid={grid}
          onOpenSettings={() => setShowSettings(true)}
          onUndo={performUndo}
          onRedo={performRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      )}
      {showSettings && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setShowSettings(false)} />}
      
      {selectedCitizen && (
          <CitizenModal 
            citizen={selectedCitizen}
            grid={grid}
            stats={stats}
            settings={settings}
            onClose={() => setSelectedCitizen(null)}
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
