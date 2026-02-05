
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum DecorationType {
  None = 'None',
  Flower = 'Flower',
  Tree = 'Tree',
  House = 'House',
  Pond = 'Pond',
  Butterfly = 'Butterfly',
  Cloud = 'Cloud'
}

export enum BuildingType {
  None = 'None',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Road = 'Road',
  Highway = 'Highway',
  Park = 'Park',
  Police = 'Police',
  School = 'School'
}

export interface TileData {
  x: number;
  y: number;
  color: string;
  decoration: DecorationType;
  buildingType: BuildingType;
  animated?: boolean;
}

export type Grid = TileData[][];

export interface AppSettings {
  volume: number;
  highContrast: boolean;
  narrator: boolean;
  weather: 'sunny' | 'rainbow' | 'glitter' | 'rain' | 'snow';
  lowGraphics?: boolean;
  shadowDetail?: 'low' | 'medium' | 'high';
  isNight?: boolean;
  ambience: boolean;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

export interface AIResponse {
  text: string;
  groundingChunks?: GroundingChunk[];
}

export interface CityStats {
  population: number;
  money: number;
  day: number;
  happiness: number;
}

export interface AIGoal {
  title: string;
  description: string;
}

export interface NewsItem {
  id: string;
  text: string;
  date?: number;
}

export interface SaveMetadata {
  id: string;
  name: string;
  lastPlayed: number;
  population: number;
  money: number;
}

export interface CityAnalysis {
  grade: string;
  title: string;
  advice: string;
}

export enum LensMode {
  None = 'None',
  LandValue = 'LandValue',
  Population = 'Population'
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

// --- Component Props Interfaces ---

export interface ProceduralBuildingProps {
  type: BuildingType;
  baseColor: string;
  x: number;
  y: number;
  level?: number;
  opacity?: number;
  transparent?: boolean;
  isNight?: boolean;
}

export interface TileProps extends TileData {
  onClick: (x: number, y: number) => void;
  settings: AppSettings;
}
