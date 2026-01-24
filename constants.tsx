
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType } from './types';

// Map Settings
export const GRID_SIZE = 60; // Much bigger map!

// Game Settings
export const TICK_RATE_MS = 2000; // Game loop updates every 2 seconds
export const INITIAL_MONEY = 5000; // More money to start!

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: 0,
    name: 'Smash',
    description: 'Remove stuff! 💥',
    color: '#ef4444', // Used for UI
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road,
    cost: 10,
    name: 'Road',
    description: 'Cars zoom here 🚗',
    color: '#374151', // gray-700
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential,
    cost: 100,
    name: 'House',
    description: '+5 Friends/day 🏠',
    color: '#f87171', // red-400
    popGen: 5,
    incomeGen: 0,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial,
    cost: 200,
    name: 'Shop',
    description: '+$15/day 🍬',
    color: '#60a5fa', // blue-400
    popGen: 0,
    incomeGen: 15,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial,
    cost: 400,
    name: 'Factory',
    description: '+$40/day 🏭',
    color: '#facc15', // yellow-400
    popGen: 0,
    incomeGen: 40,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park,
    cost: 50,
    name: 'Park',
    description: 'Fun place! 🌳',
    color: '#4ade80', // green-400
    popGen: 1,
    incomeGen: 0,
    range: 5,
  },
  [BuildingType.Police]: {
    type: BuildingType.Police,
    cost: 500,
    name: 'Police',
    description: 'Safety first! 👮',
    color: '#3b82f6', // blue-500
    popGen: 0,
    incomeGen: -10, // Cost to run
    range: 10,
  },
  [BuildingType.School]: {
    type: BuildingType.School,
    cost: 800,
    name: 'School',
    description: 'Learn stuff! 📚',
    color: '#a855f7', // purple-500
    popGen: 2,
    incomeGen: -20, // Cost to run
    range: 15,
  },
};
