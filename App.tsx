
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, Suspense, lazy, useEffect, useRef } from 'react';
import { DecorationType, BuildingType, AppSettings, AIResponse } from './types';
import { PALETTE } from './constants';
import UIOverlay from './components/UIOverlay';
import LoadingOverlay from './components/LoadingOverlay';
import StartScreen from './components/StartScreen';
import SettingsModal from './components/SettingsModal';
import { useGameState } from './hooks/useGameState';
import { 
  speakMessage, 
  analyzeArtwork, 
  generateVideo, 
  generateImage, 
  editImage, 
  askGroundedQuestion, 
  findPlacesNearby 
} from './services/geminiService';
import { audio } from './services/audio';

const IsoMap = lazy(() => import('./components/IsoMap'));

function App() {
  const {
    grid,
    stats,
    quests,
    currentSlotId,
    loadSlot,
    handleTileClick,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    calculateBuildingCost
  } = useGameState();

  const [aiEnabled, setAiEnabled] = useState(true);
  const [explosions, setExplosions] = useState<{ id: string, x: number, y: number, type: BuildingType }[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tools State
  const [activeCategory, setActiveCategory] = useState<'decoration' | 'building'>('decoration');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [selectedTool, setSelectedTool] = useState<DecorationType | BuildingType>(DecorationType.Flower);
  const [showSettings, setShowSettings] = useState(false);

  // AI & Loading State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Gemini is working its magic...");
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>({
    volume: 0.5,
    highContrast: false,
    narrator: true,
    weather: 'sunny',
    shadowDetail: 'medium',
    isNight: false,
    lowGraphics: false,
    ambience: true
  });

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [currentSlotId]);

  const onTileClick = useCallback((x: number, y: number) => {
    if (activeCategory === 'building' && selectedTool === BuildingType.None) {
      const tile = grid[y][x];
      if (tile.buildingType !== BuildingType.None) {
        setExplosions(prev => [
          ...prev, 
          { id: Math.random().toString(), x, y, type: tile.buildingType }
        ]);
      }
    }
    handleTileClick(x, y, activeCategory, selectedTool, selectedColor);
  }, [handleTileClick, activeCategory, selectedTool, selectedColor, grid]);

  const removeExplosion = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id));
  }, []);

  useEffect(() => {
      audio.setVolume(settings.volume);
      if (currentSlotId && settings.ambience) {
          audio.startAmbience();
      } else {
          audio.stopAmbience();
      }
  }, [currentSlotId, settings.ambience, settings.volume]);

  const handleMagicAction = async (prompt: string, type: 'gen' | 'edit' | 'search' | 'maps') => {
    if (!prompt.trim()) return;
    
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setAiResponse(null);
    audio.resume();
    
    try {
      if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        if (!(await (window as any).aistudio.hasSelectedApiKey())) {
          await (window as any).aistudio.openSelectKey();
        }
      }
      
      if (type === 'gen') {
        setLoadingMessage("Gemini is painting a masterpiece...");
        const imageUrl = await generateImage(prompt);
        if (imageUrl) setAiResponse({ text: "Magic created!" });
      } else if (type === 'edit') {
        setLoadingMessage("Adding some sparkle...");
        const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        const editedUrl = await editImage(mockBase64, prompt);
        if (editedUrl) setAiResponse({ text: "Magic edited!" });
      } else if (type === 'search') {
        setLoadingMessage("Searching the clouds...");
        const res = await askGroundedQuestion(prompt);
        setAiResponse(res);
        if (settings.narrator) speakMessage(res.text);
      } else if (type === 'maps') {
        setLoadingMessage("Checking the magical map...");
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const res = await findPlacesNearby(prompt, pos.coords.latitude, pos.coords.longitude);
          setAiResponse(res);
          if (settings.narrator) speakMessage(res.text);
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error(error);
      setAiResponse({ text: "The magic fizzled out. Try again!" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentSlotId) {
      return <StartScreen onStart={(slotId, ai) => { setAiEnabled(ai); loadSlot(slotId); }} />;
  }

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${settings.highContrast ? 'bg-black' : 'bg-cyan-50'}`}>
      <Suspense fallback={<LoadingOverlay message="Loading 3D World..." />}>
        <IsoMap 
          grid={grid} 
          onTileClick={onTileClick} 
          settings={settings}
          explosions={explosions}
          onExplosionComplete={removeExplosion}
          activeTool={selectedTool}
          setActiveTool={setSelectedTool}
        />
      </Suspense>

      <UIOverlay 
        grid={grid} 
        stats={stats} 
        quests={quests}
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory}
        selectedColor={selectedColor} 
        setSelectedColor={setSelectedColor}
        selectedTool={selectedTool} 
        setSelectedTool={setSelectedTool}
        onMagicAction={handleMagicAction}
        onAnimate={async () => {
          setIsGenerating(true);
          setLoadingMessage("Animating your world...");
          try {
            const url = await generateVideo("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "Live!");
            setActiveVideo(url);
          } catch(e) { console.error(e); }
          finally { setIsGenerating(false); }
        }}
        onAnalyze={async () => {
          setIsGenerating(true);
          try {
            const text = await analyzeArtwork("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
            setAiResponse({ text });
            if (settings.narrator) speakMessage(text);
          } finally { setIsGenerating(false); }
        }}
        aiResponse={aiResponse} isGenerating={isGenerating}
        onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo}
        onOpenSettings={() => setShowSettings(true)}
        getDynamicCost={(type) => calculateBuildingCost(type, 0, 0)} // Basic approximation for UI
      />

      {showSettings && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setShowSettings(false)} />}
      {isGenerating && <LoadingOverlay message={loadingMessage} />}
      
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <video src={activeVideo} controls autoPlay className="w-full rounded-3xl border-8 border-white" />
            <button onClick={() => setActiveVideo(null)} className="absolute -top-6 -right-6 bg-white rounded-full p-4 text-2xl">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
