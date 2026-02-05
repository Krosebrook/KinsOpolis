
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { DecorationType, BuildingType } from './types';

export const GRID_SIZE = 20; 
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

export interface BuildingInfo {
  name: string;
  icon: string;
  color: string;
  baseCost: number;
  pop: number;
  income: number;
  desc: string;
  scalingFactor: number; // Factor for cost increase based on existing count
}

export const BUILDINGS: Record<BuildingType, BuildingInfo> = {
  [BuildingType.None]: { name: 'Bulldoze', icon: '🚜', color: '#f1f5f9', baseCost: 0, pop: 0, income: 0, desc: 'Clear land.', scalingFactor: 0 },
  [BuildingType.Residential]: { name: 'House', icon: '🏠', color: '#60a5fa', baseCost: 100, pop: 4, income: 0, desc: 'Families live here.', scalingFactor: 1.1 },
  [BuildingType.Commercial]: { name: 'Shop', icon: '🛒', color: '#fbbf24', baseCost: 200, pop: 0, income: 15, desc: 'Shops earn money.', scalingFactor: 1.2 },
  [BuildingType.Industrial]: { name: 'Factory', icon: '🏭', color: '#94a3b8', baseCost: 300, pop: 0, income: 25, desc: 'Big money, bit messy.', scalingFactor: 1.25 },
  [BuildingType.Road]: { name: 'Road', icon: '🛣️', color: '#334155', baseCost: 50, pop: 0, income: 0, desc: 'Connects buildings.', scalingFactor: 1.05 },
  [BuildingType.Highway]: { name: 'Highway', icon: '🏎️', color: '#1e293b', baseCost: 150, pop: 0, income: 0, desc: 'Fast travel road.', scalingFactor: 1.1 },
  [BuildingType.Park]: { name: 'Park', icon: '🌳', color: '#4ade80', baseCost: 150, pop: 0, income: 0, desc: 'Makes people happy.', scalingFactor: 1.15 },
  [BuildingType.Police]: { name: 'Police', icon: '🚓', color: '#1e40af', baseCost: 500, pop: 0, income: 0, desc: 'Keeps city safe.', scalingFactor: 1.5 },
  [BuildingType.School]: { name: 'School', icon: '🏫', color: '#f87171', baseCost: 400, pop: 0, income: 0, desc: 'For learning.', scalingFactor: 1.4 },
};
