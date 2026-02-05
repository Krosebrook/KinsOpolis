
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Grid, CityStats, CitizenThought, AIResponse } from "../types";

/**
 * Creates a new instance of the GoogleGenAI client.
 * This is done on-demand to ensure the latest API key from the environment/dialog is used.
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Extracts raw base64 bytes from a data URI or raw base64 string.
 */
const getBase64Bytes = (base64String: string) => {
  if (base64String.includes(',')) {
    return base64String.split(',')[1];
  }
  return base64String;
};

/**
 * Generates an image using the Gemini 3 Pro Image model.
 * Supports customizable aspect ratio and image size.
 */
export const generateImage = async (prompt: string, aspectRatio: string = "1:1", imageSize: string = "1K") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `A magical, storybook illustration for children: ${prompt}. Bold colors, simple shapes.` }] },
    config: {
      imageConfig: { 
        aspectRatio: aspectRatio as any, 
        imageSize: imageSize as any 
      }
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

/**
 * Edits an existing image using text instructions via Gemini 2.5 Flash Image.
 */
export const editImage = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: getBase64Bytes(base64Image), mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

/**
 * Generates a short video from an image using Veo 3.1.
 * Returns a blob URL to the generated MP4.
 */
export const generateVideo = async (base64Image: string, prompt: string, aspectRatio: "16:9" | "9:16" = "16:9") => {
  const ai = getAI();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Make this magical drawing come to life: ${prompt}`,
    image: { imageBytes: getBase64Bytes(base64Image), mimeType: 'image/png' },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  });
  
  // Polling for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Must append API key to fetch the video content
  const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

/**
 * Analyzes an image using the thinking model (Gemini 3 Pro) to generate a supportive story.
 */
export const analyzeArtwork = async (base64Image: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: getBase64Bytes(base64Image), mimeType: 'image/png' } },
        { text: "Look at this magical drawing. What do you see? Tell me a story about it in a way that is joyful and supportive for a young child." }
      ]
    },
    config: {
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });
  return response.text;
};

/**
 * Converts text to speech using Gemini 2.5 Flash TTS.
 * Plays the audio immediately using the Web Audio API.
 */
export const speakMessage = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say warmly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) return;
  
  // Audio Decoding
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioData = atob(base64Audio);
  const bytes = new Uint8Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) bytes[i] = audioData.charCodeAt(i);
  
  const buffer = new Int16Array(bytes.buffer);
  const audioBuffer = ctx.createBuffer(1, buffer.length, 24000);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < buffer.length; i++) {
    channelData[i] = buffer[i] / 32768.0;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
};

/**
 * Performs a grounded search using Google Search tool.
 */
export const askGroundedQuestion = async (question: string): Promise<AIResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: question,
    config: { tools: [{ googleSearch: {} }] },
  });
  return {
    text: response.text || "I'm not sure, let me look it up!",
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Finds nearby places using Google Maps grounding.
 */
export const findPlacesNearby = async (query: string, lat: number, lng: number): Promise<AIResponse> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
    },
  });
  return {
    text: response.text || "I found some places for you!",
    groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

/**
 * Generates a persona-based thought for a citizen using JSON schema.
 */
export const generateCitizenThought = async (stats: CityStats, nearestBuilding: string, weather: string, isNight: boolean): Promise<CitizenThought | null> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As a citizen (Pop: ${stats.population}, Weather: ${weather}, Night: ${isNight ? 'Yes' : 'No'}), you are near a ${nearestBuilding}. What is your happy thought?`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          job: { type: Type.STRING },
          thought: { type: Type.STRING },
          mood: { type: Type.STRING, enum: ['happy', 'neutral', 'angry'] }
        },
        required: ['name', 'job', 'thought', 'mood']
      }
    }
  });
  
  try {
    return JSON.parse(response.text || "{}") as CitizenThought;
  } catch (e) {
    return null;
  }
};
