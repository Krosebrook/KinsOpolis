
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
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
    currentSlotId,
    loadSlot,
    handleTileClick,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo
  } = useGameState();

  const [aiEnabled, setAiEnabled] = useState(true);

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

  // Handle Tile Interaction from hook
  const onTileClick = useCallback((x: number, y: number) => {
    handleTileClick(x, y, activeCategory, selectedTool, selectedColor);
  }, [handleTileClick, activeCategory, selectedTool, selectedColor]);

  // Audio Ambience Management
  useEffect(() => {
      audio.setVolume(settings.volume);
      
      if (currentSlotId && settings.ambience) {
          audio.startAmbience();
      } else {
          audio.stopAmbience();
      }
  }, [currentSlotId, settings.ambience, settings.volume]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Disable shortcuts if settings modal is open or typing in input
        if (showSettings || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        // Undo/Redo
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
            } else if (e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
            return;
        }

        // Tools
        const key = e.key.toLowerCase();
        if (key === 'b') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.None);
            audio.playClick();
        } else if (key === 'r') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.Road);
            audio.playClick();
        } else if (key === '1') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.Residential);
            audio.playClick();
        } else if (key === '2') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.Commercial);
            audio.playClick();
        } else if (key === '3') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.Industrial);
            audio.playClick();
        } else if (key === '4') {
            setActiveCategory('building');
            setSelectedTool(BuildingType.Park);
            audio.playClick();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, showSettings]);

  // Start Screen Handler
  const handleStartGame = (slotId: string, ai: boolean) => {
    setAiEnabled(ai);
    loadSlot(slotId);
  };

  const ensureApiKey = async () => {
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
      if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
      }
    }
  };

  const handleApiError = async (error: any) => {
    console.error(error);
    let isPermissionError = false;
    const msg = (error?.message || error?.toString() || '').toLowerCase();
    const json = JSON.stringify(error || {}).toLowerCase();
    
    if (error?.status === 403 || error?.error?.code === 403 || 
        msg.includes('403') || msg.includes('permission') || msg.includes('denied') ||
        json.includes('403') || json.includes('permission')) {
        isPermissionError = true;
    }

    if (isPermissionError) {
        if (typeof (window as any).aistudio?.openSelectKey === 'function') {
            await (window as any).aistudio.openSelectKey();
            setAiResponse({ text: "I need your permission to access these magic tools! Please try again." });
            return;
        }
    }
    setAiResponse({ text: "Oh no! The magic fizzled out for a moment. Let's try again!" });
  };

  const handleMagicAction = async (prompt: string, type: 'gen' | 'edit' | 'search' | 'maps') => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setAiResponse(null);
    audio.resume();
    
    try {
      await ensureApiKey();
      
      if (type === 'gen') {
        setLoadingMessage("Gemini is painting a new masterpiece...");
        const imageUrl = await generateImage(prompt, "1:1", "1K");
        if (imageUrl) setAiResponse({ text: "I made this magical drawing just for you!" });
      } else if (type === 'edit') {
        setLoadingMessage("Adding some sparkle...");
        const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        const editedUrl = await editImage(mockBase64, prompt);
        if (editedUrl) setAiResponse({ text: "I added some special magic to the picture!" });
      } else if (type === 'search') {
        setLoadingMessage("Looking through the magical library...");
        const res = await askGroundedQuestion(prompt);
        setAiResponse(res);
        if (settings.narrator) speakMessage(res.text);
      } else if (type === 'maps') {
        setLoadingMessage("Checking the magical map...");
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const res = await findPlacesNearby(prompt, pos.coords.latitude, pos.coords.longitude);
              setAiResponse(res);
              if (settings.narrator) speakMessage(res.text);
            } catch (err) {
              await handleApiError(err);
            }
          }, (err) => {
            setAiResponse({ text: "I couldn't find your location on the map." });
            setIsGenerating(false);
          });
          return;
        } else {
             setAiResponse({ text: "I don't know where we are!" });
             setIsGenerating(false);
        }
      }
    } catch (error) {
      await handleApiError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnimate = async () => {
    await ensureApiKey();
    setIsGenerating(true);
    setLoadingMessage("Bringing your world to life...");
    try {
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const videoUrl = await generateVideo(mockBase64, "A magical colored world comes to life");
      setActiveVideo(videoUrl);
    } catch (error) {
      await handleApiError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    setIsGenerating(true);
    setLoadingMessage("Looking at your creation...");
    try {
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const text = await analyzeArtwork(mockBase64);
      setAiResponse({ text });
      if (settings.narrator) speakMessage(text);
    } catch (error) {
      await handleApiError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentSlotId) {
      return <StartScreen onStart={handleStartGame} />;
  }

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${settings.highContrast ? 'bg-black' : 'bg-cyan-50'}`}>
      <Suspense fallback={<LoadingOverlay message="Opening the magic book..." />}>
        <IsoMap 
          grid={grid} 
          onTileClick={onTileClick} 
          settings={settings}
        />
      </Suspense>

      <UIOverlay 
        grid={grid}
        stats={stats}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        onMagicAction={handleMagicAction}
        onAnimate={handleAnimate}
        onAnalyze={handleAnalyze}
        aiResponse={aiResponse}
        isGenerating={isGenerating}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showSettings && (
          <SettingsModal 
              settings={settings} 
              onUpdate={setSettings} 
              onClose={() => setShowSettings(false)} 
          />
      )}

      {isGenerating && <LoadingOverlay message={loadingMessage} />}
      
      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full">
            <video 
              src={activeVideo} 
              controls 
              autoPlay 
              className="w-full rounded-3xl shadow-2xl border-8 border-white"
            />
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute -top-6 -right-6 bg-white text-slate-800 rounded-full p-5 text-3xl shadow-2xl hover:scale-110 transition-transform pointer-events-auto border-4 border-slate-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
