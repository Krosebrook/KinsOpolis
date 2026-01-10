/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Grid, CityStats, AIGoal, NewsItem } from '../types';
import { GRID_SIZE } from '../constants';

const STORAGE_KEY = 'super_city_save_v1';

interface SaveData {
  grid: Grid;
  stats: CityStats;
  goal: AIGoal | null;
  news: NewsItem[];
  gameStarted: boolean;
  version: number;
}

export const saveGame = (data: Omit<SaveData, 'version'>) => {
  try {
    const payload: SaveData = { ...data, version: GRID_SIZE };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save game", e);
  }
};

export const loadGame = (): Omit<SaveData, 'version'> | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    
    // Invalidate if grid size changed to avoid index errors
    if (data.version !== GRID_SIZE) {
        console.log("Save version/grid size mismatch, resetting save.");
        return null;
    }
    return data;
  } catch (e) {
    console.warn("Failed to load game", e);
    return null;
  }
};

export const clearSave = () => {
    localStorage.removeItem(STORAGE_KEY);
};