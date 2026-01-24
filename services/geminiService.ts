
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem, CitizenThought } from "../types";
import { BUILDINGS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = 'gemini-3-flash-preview';

// --- Goal Generation ---

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A super fun, short mission for a 10-year-old Mayor.",
    },
    targetType: {
      type: Type.STRING,
      enum: ['population', 'money', 'building_count'],
      description: "What to check.",
    },
    targetValue: {
      type: Type.INTEGER,
      description: "The number to reach.",
    },
    buildingType: {
      type: Type.STRING,
      enum: [BuildingType.Residential, BuildingType.Commercial, BuildingType.Industrial, BuildingType.Park, BuildingType.Road],
      description: "Which building to count.",
    },
    reward: {
      type: Type.INTEGER,
      description: "Money prize!",
    },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  // Count buildings
  const counts: Record<string, number> = {};
  grid.flat().forEach(tile => {
    counts[tile.buildingType] = (counts[tile.buildingType] || 0) + 1;
  });

  const context = `
    Your City Stats:
    Day: ${stats.day}
    Money: $${stats.money}
    People: ${stats.population}
    Buildings: ${JSON.stringify(counts)}
  `;

  const prompt = `You are a fun Robot Helper for a 10-year-old City Mayor! 🤖
  Create a fun, easy mission for the Mayor. 
  Examples: "Build 5 Houses for new friends! 🏠", "Make a Park for playing! 🌳", "Save $500 for candy! 🍬".
  Keep it simple and use emojis! Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: goalSchema,
        temperature: 0.8,
      },
    });

    if (response.text) {
      const goalData = JSON.parse(response.text) as Omit<AIGoal, 'completed'>;
      return { ...goalData, completed: false };
    }
  } catch (error) {
    console.error("Error generating goal:", error);
  }
  return null;
};

// --- News Feed Generation ---

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "A funny, 1-sentence news headline for kids." },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

export const generateNewsEvent = async (stats: CityStats, recentAction: string | null): Promise<NewsItem | null> => {
  const context = `City Stats - People: ${stats.population}, Money: ${stats.money}.`;
  const prompt = "Write a super short, funny news headline for a kid's city game! Use emojis! Example: 'Cats take over the park! 🐱' or 'Donut factory explodes with flavor! 🍩'";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 1.1, 
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: Date.now().toString() + Math.random(),
        text: data.text,
        type: data.type,
      };
    }
  } catch (error) {
    console.error("Error generating news:", error);
  }
  return null;
};

// --- Citizen Thoughts ---

const citizenSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "A funny fake name" },
        job: { type: Type.STRING, description: "A silly job (e.g. 'Cloud Watcher')" },
        thought: { type: Type.STRING, description: "One sentence observation about their surroundings or the weather." },
        mood: { type: Type.STRING, enum: ['happy', 'angry', 'neutral'] }
    },
    required: ['name', 'job', 'thought', 'mood']
};

export const generateCitizenThought = async (
    stats: CityStats, 
    nearbyBuilding: string, 
    weather: string, 
    isNight: boolean
): Promise<CitizenThought | null> => {
    const context = `
        The citizen is walking near a ${nearbyBuilding}.
        Weather: ${weather}.
        Time: ${isNight ? 'Night' : 'Day'}.
        City Population: ${stats.population}.
        City Money: ${stats.money}.
    `;
    
    const prompt = `Generate a random citizen persona for a city builder game. 
    They should make a brief, funny comment about their current situation (weather, location, or time).
    Keep it kid-friendly.`;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${context}\n${prompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: citizenSchema,
                temperature: 1.0,
            },
        });

        if (response.text) {
            return JSON.parse(response.text) as CitizenThought;
        }
    } catch (error) {
        console.error("Error generating thought:", error);
    }
    return null;
};
