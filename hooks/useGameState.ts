
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useCallback, useEffect } from 'react';
import { Grid, CityStats, BuildingType, DecorationType, TileData } from '../types';
import { GRID_SIZE, BUILDINGS } from '../constants';
import { audio } from '../services/audio';
import { saveGame, loadGame } from '../services/storage';

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ 
        x, y, 
        color: '#f8fafc', 
        decoration: DecorationType.None,
        buildingType: BuildingType.None 
      });
    }
    grid.push(row);
  }
  return grid;
};

interface HistoryState {
  grid: Grid;
  stats: CityStats;
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

  // Undo/Redo History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const loadSlot = useCallback((slotId: string) => {
    setCurrentSlotId(slotId);
    const data = loadGame(slotId);
    if (data) {
      setGrid(data.grid);
      setStats(data.stats);
      setHistory([{ grid: data.grid, stats: data.stats }]);
      setHistoryIndex(0);
    } else {
      const initialGrid = createInitialGrid();
      const initialStats = { population: 0, money: 1000, day: 1, happiness: 100 };
      setGrid(initialGrid);
      setStats(initialStats);
      setHistory([{ grid: initialGrid, stats: initialStats }]);
      setHistoryIndex(0);
    }
  }, []);

  // Auto Save
  useEffect(() => {
    if (currentSlotId) {
      saveGame(currentSlotId, {
        grid,
        stats,
        goal: null,
        news: [],
        gameStarted: true
      });
    }
  }, [grid, stats, currentSlotId]);

  const addToHistory = useCallback((newGrid: Grid, newStats: CityStats) => {
    setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        const newState = { 
            grid: JSON.parse(JSON.stringify(newGrid)), 
            stats: { ...newStats } 
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
        setHistoryIndex(historyIndex - 1);
        audio.playClick();
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
        const next = history[historyIndex + 1];
        setGrid(next.grid);
        setStats(next.stats);
        setHistoryIndex(historyIndex + 1);
        audio.playClick();
    }
  }, [history, historyIndex]);

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

        // Bulldoze
        if (buildingTool === BuildingType.None) {
          if (tile.buildingType !== BuildingType.None) {
             const cost = BUILDINGS[tile.buildingType].cost;
             newStats.money += Math.floor(cost * 0.5); // 50% refund
             tile.buildingType = BuildingType.None;
             audio.playBulldoze();
             updated = true;
          }
        } else {
          // Build
          if (tile.buildingType === BuildingType.None) {
            const cost = BUILDINGS[buildingTool].cost;
            if (newStats.money >= cost) {
               newStats.money -= cost;
               tile.buildingType = buildingTool;
               tile.decoration = DecorationType.None; 
               audio.playBuild();
               updated = true;
            } else {
               audio.playError();
            }
          } else if (tile.buildingType !== buildingTool) {
             audio.playError(); 
          }
        }
      } else {
        // Decoration
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
          setStats(newStats);
          addToHistory(nextGrid, newStats);
          return nextGrid;
      }
      return prevGrid;
    });
  }, [stats, addToHistory]);

  return {
    grid,
    stats,
    currentSlotId,
    loadSlot,
    handleTileClick,
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};
