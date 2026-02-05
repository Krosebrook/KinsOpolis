
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Grid, BuildingType, CityStats, CityAnalysis } from '../types';
import { GRID_SIZE } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

const modelId = 'gemini-3-flash-preview';

/**
 * Computes a normalized 0-1 map of Land Value.
 * Value spreads from Parks (high value).
 */
export const computeLandValueMap = (grid: Grid): Float32Array => {
  const map = new Float32Array(GRID_SIZE * GRID_SIZE);
  const sources: { x: number, y: number }[] = [];

  // 1. Identify value sources (Parks)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x].buildingType === BuildingType.Park) {
        sources.push({ x, y });
      }
    }
  }

  // If no parks, base value is flat low
  if (sources.length === 0) {
      map.fill(0.1);
      return map;
  }

  // 2. Simple distance field using BFS
  const distMap = new Float32Array(GRID_SIZE * GRID_SIZE).fill(999);
  const queue = sources.map(s => ({ ...s, dist: 0 }));
  const visited = new Set<string>();
  
  sources.forEach(s => {
      distMap[s.y * GRID_SIZE + s.x] = 0;
      visited.add(`${s.x},${s.y}`);
  });

  let head = 0;
  while(head < queue.length) {
      const { x, y, dist } = queue[head++];
      
      const idx = y * GRID_SIZE + x;
      if (dist < distMap[idx]) distMap[idx] = dist;

      // Max falloff range = 10 tiles
      if(dist >= 10) continue;

      const neighbors = [
          { nx: x + 1, ny: y },
          { nx: x - 1, ny: y },
          { nx: x, ny: y + 1 },
          { nx: x, ny: y - 1 }
      ];

      for(const {nx, ny} of neighbors) {
          if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              const key = `${nx},${ny}`;
              if(!visited.has(key)) {
                  visited.add(key);
                  queue.push({ x: nx, y: ny, dist: dist + 1 });
              }
          }
      }
  }

  // 3. Normalize and Invert (Close = High Value)
  for(let i=0; i<map.length; i++) {
     const d = distMap[i];
     if (d > 10) map[i] = 0.1;
     else map[i] = 1.0 - (d / 10.0); // 0 dist = 1.0, 10 dist = 0.0
  }

  return map;
};

/**
 * Computes simple density map based on Residential buildings.
 */
export const computePopulationMap = (grid: Grid): Float32Array => {
    const map = new Float32Array(GRID_SIZE * GRID_SIZE);
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const tile = grid[y][x];
            // Residential = 1.0, Commercial = 0.5 (Jobs), Others = 0.1
            const val = tile.buildingType === BuildingType.Residential ? 1.0 :
                        tile.buildingType === BuildingType.Commercial ? 0.5 : 0.0;
            map[y * GRID_SIZE + x] = val;
        }
    }
    return map;
}

const reviewSchema = {
    type: Type.OBJECT,
    properties: {
        grade: { type: Type.STRING, enum: ['A+', 'A', 'B', 'C', 'D', 'F'], description: "Letter grade for the city." },
        title: { type: Type.STRING, description: "A funny or cool title for the city (e.g. 'The Concrete Paradise')." },
        advice: { type: Type.STRING, description: "Strategic advice for the mayor." }
    },
    required: ['grade', 'title', 'advice']
};

export const generateCityReview = async (stats: CityStats, grid: Grid): Promise<CityAnalysis | null> => {
    // Instantiate here to pick up latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const counts: Record<string, number> = {};
    grid.flat().forEach(t => counts[t.buildingType] = (counts[t.buildingType] || 0) + 1);
    
    // Check balance
    const res = counts[BuildingType.Residential] || 0;
    const com = counts[BuildingType.Commercial] || 0;
    const ind = counts[BuildingType.Industrial] || 0;
    const park = counts[BuildingType.Park] || 0;
    
    const context = `
    City Stats:
    - Population: ${stats.population}
    - Money: $${stats.money}
    - Buildings: ${res} Homes, ${com} Shops, ${ind} Factories, ${park} Parks.
    - Day: ${stats.day}
    `;

    const prompt = `You are a strict City Planner AI. Review this city layout. 
    Balance Ratios: Homes should support Shops/Factories. Parks are needed for happiness.
    Give a fair grade (A-F), a creative title, and 1 sentence of solid strategic advice.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${context}\n${prompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: reviewSchema,
                temperature: 0.7,
            },
        });

        if (response.text) {
            return JSON.parse(response.text) as CityAnalysis;
        }
    } catch (e: any) {
        console.error("AI Review failed", e);
        
        let isPermissionError = false;
        if (e?.status === 403 || e?.error?.code === 403) isPermissionError = true;
        const msg = (e?.message || e?.toString() || '').toLowerCase();
        if (msg.includes('403') || msg.includes('permission')) isPermissionError = true;
        try {
            const json = JSON.stringify(e).toLowerCase();
            if (json.includes('403') || json.includes('permission')) isPermissionError = true;
        } catch {}

        if (isPermissionError) {
            if (typeof (window as any).aistudio?.openSelectKey === 'function') {
                (window as any).aistudio.openSelectKey();
            }
        }
    }
    return null;
}
