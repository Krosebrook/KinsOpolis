
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { DecorationType, BuildingType } from './types';

export const GRID_SIZE = 20; // Smaller, more focusable grid for kids
export const TICK_RATE_MS = 3000;

export const PALETTE = [
  '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', 
  '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC'
];

export const DECORATIONS: Record<DecorationType, { name: string, icon: string, color: string }> = {
  [DecorationType.None]: { name: 'Eraser', icon: '🧼', color: '#f1f5f9' },
  [DecorationType.Flower]: { name: 'Flower', icon: '🌸', color: '#FFADAD' },
  [DecorationType.Tree]: { name: 'Tree', icon: '🌳', color: '#CAFFBF' },
  [DecorationType.House]: { name: 'Cottage', icon: '🏡', color: '#FFD6A5' },
  [DecorationType.Pond]: { name: 'Pond', icon: '💧', color: '#9BF6FF' },
  [DecorationType.Butterfly]: { name: 'Butterfly', icon: '🦋', color: '#FFC6FF' },
  [DecorationType.Cloud]: { name: 'Cloud', icon: '☁️', color: '#FFFFFC' },
};

export const BUILDINGS: Record<BuildingType, { name: string, icon: string, color: string, cost: number, pop: number, income: number, desc: string }> = {
  [BuildingType.None]: { name: 'Bulldoze', icon: '🚜', color: '#f1f5f9', cost: 0, pop: 0, income: 0, desc: 'Clear land.' },
  [BuildingType.Residential]: { name: 'House', icon: '🏠', color: '#60a5fa', cost: 100, pop: 4, income: 0, desc: 'Families live here.' },
  [BuildingType.Commercial]: { name: 'Shop', icon: '🛒', color: '#fbbf24', cost: 200, pop: 0, income: 15, desc: 'Shops earn money.' },
  [BuildingType.Industrial]: { name: 'Factory', icon: '🏭', color: '#94a3b8', cost: 300, pop: 0, income: 25, desc: 'Big money, bit messy.' },
  [BuildingType.Road]: { name: 'Road', icon: '🛣️', color: '#334155', cost: 50, pop: 0, income: 0, desc: 'Connects buildings.' },
  [BuildingType.Highway]: { name: 'Highway', icon: '🏎️', color: '#1e293b', cost: 150, pop: 0, income: 0, desc: 'Fast travel road.' },
  [BuildingType.Park]: { name: 'Park', icon: '🌳', color: '#4ade80', cost: 150, pop: 0, income: 0, desc: 'Makes people happy.' },
  [BuildingType.Police]: { name: 'Police', icon: '🚓', color: '#1e40af', cost: 500, pop: 0, income: 0, desc: 'Keeps city safe.' },
  [BuildingType.School]: { name: 'School', icon: '🏫', color: '#f87171', cost: 400, pop: 0, income: 0, desc: 'For learning.' },
};
