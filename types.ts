
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  Police = 'Police',
  School = 'School',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  name: string;
  description: string;
  color: string; // Main color for 3D material
  popGen: number; // Population generation per tick
  incomeGen: number; // Money generation per tick
  range?: number; // Effect radius
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  variant?: number;
  level?: number; // 1 = Basic, 2 = Medium, 3 = High
}

export type Grid = TileData[][];

export interface CityStats {
  money: number;
  population: number;
  day: number;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count';
  targetValue: number;
  buildingType?: BuildingType; // If target is building_count
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

export enum LensMode {
  None = 'None',
  LandValue = 'LandValue',
  Population = 'Population',
  Services = 'Services', // New lens
}

export interface CityAnalysis {
  grade: string;
  title: string;
  advice: string;
}

export interface AppSettings {
  volume: number; // 0.0 to 1.0
  lowGraphics: boolean; // Disables shadows/effects
  shadowDetail: 'low' | 'medium' | 'high'; // New setting
  showTutorial: boolean;
  weather: 'sunny' | 'rain' | 'snow'; // New setting
  isNight: boolean; // New setting (debug/manual toggle or auto)
}

export interface SaveMetadata {
  id: string;
  name: string;
  lastPlayed: number;
  population: number;
  money: number;
}

export interface Citizen {
    id: string;
    x: number;
    y: number;
    color: string;
}

export interface CitizenThought {
    name: string;
    job: string;
    thought: string;
    mood: 'happy' | 'angry' | 'neutral';
}
