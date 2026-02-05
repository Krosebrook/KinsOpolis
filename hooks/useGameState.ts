
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Grid, CityStats, BuildingType, DecorationType, TileData, Quest } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';
import { audio } from '../services/audio';
import { saveGame, loadGame } from '../services/storage';
import { computeLandValueMap } from '../services/analytics';

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ 
        x, y, 
        color: '#f8fafc', 
        decoration: DecorationType.None,
        buildingType: BuildingType.None,
        level: 1
      });
    }
    grid.push(row);
  }
  return grid;
};

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Beginner Builder', description: 'Build 3 Houses', targetValue: 3, currentValue: 0, type: 'build', targetKey: BuildingType.Residential, rewardMoney: 500, completed: false },
  { id: 'q2', title: 'Industrialist', description: 'Build 2 Factories', targetValue: 2, currentValue: 0, type: 'build', targetKey: BuildingType.Industrial, rewardMoney: 800, completed: false },
  { id: 'q3', title: 'Booming Town', description: 'Reach a population of 20', targetValue: 20, currentValue: 0, type: 'population', rewardMoney: 1000, completed: false },
  { id: 'q4', title: 'Highway To Heaven', description: 'Build a Highway segment', targetValue: 1, currentValue: 0, type: 'build', targetKey: BuildingType.Highway, rewardMoney: 400, completed: false },
  { id: 'q5', title: 'Money Maker', description: 'Save $5000', targetValue: 5000, currentValue: 0, type: 'money', rewardMoney: 2000, completed: false },
];

interface HistoryState {
  grid: Grid;
  stats: CityStats;
  quests: Quest[];
}

export const useGameState = () => {
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);
  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>({
    population: 0,
    money: 1000,
    day: 1,
    happiness: 100
  });
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);

  const landValueMap = useMemo(() => computeLandValueMap(grid), [grid]);

  // Undo/Redo History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const calculateBuildingCost = useCallback((type: BuildingType, x: number, y: number): number => {
    if (type === BuildingType.None) return 0;
    const info = BUILDINGS[type];
    
    // 1. Base Cost
    let finalCost = info.baseCost;

    // 2. Supply/Demand Scaling (Cost increases with the number of existing buildings of same type)
    const existingCount = grid.flat().filter(t => t.buildingType === type).length;
    finalCost *= Math.pow(info.scalingFactor, existingCount);

    // 3. Land Value Surcharge (Up to +50% cost for high-value areas)
    const landVal = landValueMap[y * GRID_SIZE + x] || 0;
    finalCost *= (1 + landVal * 0.5);

    // 4. Wealth Tax (Cost increases slightly if you have a lot of money)
    if (stats.money > 10000) {
      finalCost *= 1.25;
    }

    return Math.round(finalCost);
  }, [grid, landValueMap, stats.money]);

  const loadSlot = useCallback((slotId: string) => {
    setCurrentSlotId(slotId);
    const data = loadGame(slotId);
    if (data) {
      setGrid(data.grid);
      setStats(data.stats);
      // Fixed: SaveData now includes quests, so we can access it directly
      setQuests(data.quests || INITIAL_QUESTS);
      setHistory([{ grid: data.grid, stats: data.stats, quests: data.quests || INITIAL_QUESTS }]);
      setHistoryIndex(0);
    } else {
      const initialGrid = createInitialGrid();
      const initialStats = { population: 0, money: 1000, day: 1, happiness: 100 };
      setGrid(initialGrid);
      setStats(initialStats);
      setQuests(INITIAL_QUESTS);
      setHistory([{ grid: initialGrid, stats: initialStats, quests: INITIAL_QUESTS }]);
      setHistoryIndex(0);
    }
  }, []);

  useEffect(() => {
    if (currentSlotId) {
      saveGame(currentSlotId, {
        grid,
        stats,
        quests,
        goal: null,
        news: [],
        gameStarted: true
      });
    }
  }, [grid, stats, quests, currentSlotId]);

  const addToHistory = useCallback((newGrid: Grid, newStats: CityStats, newQuests: Quest[]) => {
    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        const newState = { 
            grid: JSON.parse(JSON.stringify(newGrid)), 
            stats: { ...newStats },
            quests: JSON.parse(JSON.stringify(newQuests))
        };
        newHistory.push(newState);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
        const prev = history[historyIndex - 1];
        setGrid(prev.grid);
        setStats(prev.stats);
        setQuests(prev.quests);
        setHistoryIndex(historyIndex - 1);
        audio.playClick();
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
        const next = history[historyIndex + 1];
        setGrid(next.grid);
        setStats(next.stats);
        setQuests(next.quests);
        setHistoryIndex(historyIndex + 1);
        audio.playClick();
    }
  }, [history, historyIndex]);

  const updateQuests = (newGrid: Grid, newStats: CityStats) => {
    let earnedMoney = 0;
    const nextQuests = quests.map(q => {
      if (q.completed) return q;

      let currentVal = 0;
      if (q.type === 'build') {
        currentVal = newGrid.flat().filter(t => t.buildingType === q.targetKey).length;
      } else if (q.type === 'population') {
        currentVal = newStats.population;
      } else if (q.type === 'money') {
        currentVal = newStats.money;
      }

      const isCompleted = currentVal >= q.targetValue;
      if (isCompleted) {
        earnedMoney += q.rewardMoney;
        audio.playCash();
      }

      return { ...q, currentValue: currentVal, completed: isCompleted };
    });

    if (earnedMoney > 0) {
      newStats.money += earnedMoney;
    }

    return nextQuests;
  };

  const handleTileClick = useCallback((
      x: number, 
      y: number, 
      activeCategory: 'decoration' | 'building',
      selectedTool: DecorationType | BuildingType,
      selectedColor: string
  ) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    audio.init();
    audio.resume();

    setGrid(prevGrid => {
      const nextGrid = prevGrid.map(row => row.map(tile => ({ ...tile })));
      const tile = nextGrid[y][x];
      let updated = false;
      let newStats = { ...stats };

      if (activeCategory === 'building') {
        const buildingTool = selectedTool as BuildingType;

        if (buildingTool === BuildingType.None) {
          if (tile.buildingType !== BuildingType.None) {
             const cost = calculateBuildingCost(tile.buildingType, x, y);
             newStats.money += Math.floor(cost * 0.3); 
             tile.buildingType = BuildingType.None;
             tile.level = 1;
             audio.playBulldoze();
             updated = true;
          }
        } else {
          if (tile.buildingType === BuildingType.None) {
            const cost = calculateBuildingCost(buildingTool, x, y);
            if (newStats.money >= cost) {
               newStats.money -= cost;
               tile.buildingType = buildingTool;
               tile.decoration = DecorationType.None;
               tile.level = 1;
               audio.playBuild();
               updated = true;
            } else {
               audio.playError();
            }
          } else if (tile.buildingType === buildingTool) {
            const upgradeCost = Math.round(calculateBuildingCost(buildingTool, x, y) * (1 + tile.level * 0.8));
            if (tile.level < 5 && newStats.money >= upgradeCost) {
                newStats.money -= upgradeCost;
                tile.level += 1;
                audio.playBuild();
                updated = true;
            } else {
                audio.playError();
            }
          } else {
             audio.playError(); 
          }
        }
      } else {
        if (selectedTool === DecorationType.None) {
            if (tile.decoration !== DecorationType.None || tile.color !== '#f8fafc') {
                tile.decoration = DecorationType.None;
                tile.color = '#f8fafc';
                updated = true;
            }
        } else {
            tile.color = selectedColor;
            if (Object.values(DecorationType).includes(selectedTool as DecorationType)) {
                 tile.decoration = selectedTool as DecorationType;
            }
            updated = true;
        }
      }

      if (updated) {
          let newPop = 0;
          nextGrid.flat().forEach(t => {
            if (t.buildingType !== BuildingType.None) {
              const info = BUILDINGS[t.buildingType];
              const levelMult = 1 + (t.level - 1) * 0.75;
              newPop += Math.floor(info.pop * levelMult);
            }
          });
          newStats.population = newPop;

          const nextQuests = updateQuests(nextGrid, newStats);
          setStats(newStats);
          setQuests(nextQuests);
          addToHistory(nextGrid, newStats, nextQuests);
          return nextGrid;
      }
      return prevGrid;
    });
  }, [stats, quests, addToHistory, calculateBuildingCost]);

  return {
    grid,
    stats,
    quests,
    currentSlotId,
    loadSlot,
    handleTileClick,
    handleUndo,
    handleRedo,
    calculateBuildingCost,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};
