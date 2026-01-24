
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Grid, CityStats, AIGoal, NewsItem, SaveMetadata } from '../types';
import { GRID_SIZE } from '../constants';

const META_KEY = 'sky_city_meta';
const SAVE_PREFIX = 'sky_city_save_';

export interface SaveData {
  grid: Grid;
  stats: CityStats;
  goal: AIGoal | null;
  news: NewsItem[];
  gameStarted: boolean;
  version: number;
}

// Metadata Management
export const getSaveSlots = (): SaveMetadata[] => {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const updateMeta = (id: string, data: Partial<SaveMetadata>) => {
  const slots = getSaveSlots();
  const idx = slots.findIndex(s => s.id === id);
  if (idx >= 0) {
    slots[idx] = { ...slots[idx], ...data, lastPlayed: Date.now() };
  } else {
    // Should verify name exists if creating new, but for internal use:
    if (data.name) {
       slots.push({
         id,
         name: data.name,
         lastPlayed: Date.now(),
         population: data.population || 0,
         money: data.money || 0
       });
    }
  }
  localStorage.setItem(META_KEY, JSON.stringify(slots));
};

export const createSaveSlot = (name: string): string => {
  const id = Date.now().toString();
  updateMeta(id, { name, population: 0, money: 0 });
  return id;
};

export const deleteSaveSlot = (id: string) => {
  const slots = getSaveSlots().filter(s => s.id !== id);
  localStorage.setItem(META_KEY, JSON.stringify(slots));
  localStorage.removeItem(SAVE_PREFIX + id);
};

// Data Management
export const saveGame = (id: string, data: Omit<SaveData, 'version'>) => {
  try {
    const payload: SaveData = { ...data, version: GRID_SIZE };
    localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(payload));
    
    // Update metadata for UI display
    updateMeta(id, { 
      population: data.stats.population, 
      money: data.stats.money 
    });
  } catch (e) {
    console.warn("Failed to save game", e);
  }
};

export const loadGame = (id: string): Omit<SaveData, 'version'> | null => {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + id);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    
    if (data.version !== GRID_SIZE) {
        console.log("Save version mismatch.");
        return null;
    }
    return data;
  } catch (e) {
    console.warn("Failed to load game", e);
    return null;
  }
};
