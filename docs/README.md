
# Sky Metropolis Builder 3000

A magical AI-powered creative sandbox for children, built with React, Three.js, and Google's Gemini API.

## 🏗️ Architecture

### Core Components
- **`App.tsx`**: Main entry point, orchestrates UI and Game State.
- **`IsoMap.tsx`**: Renders the 3D isometric world using `@react-three/fiber`.
- **`UIOverlay.tsx`**: Heads-up display for tools, stats, and magic actions.
- **`ProceduralBuilding.tsx`**: Generates unique building variations deterministically based on grid position.

### State Management
- **`hooks/useGameState.ts`**: Encapsulates game logic including:
  - Grid manipulation (placing buildings/decorations)
  - City statistics (population, money)
  - History stack (Undo/Redo)
  - Save/Load functionality via `localStorage`.

### AI Services (`services/geminiService.ts`)
The app leverages the `@google/genai` SDK for various magical features:
- **Generative Art**: `gemini-3-pro-image-preview` for creating textures/art.
- **Image Editing**: `gemini-2.5-flash-image` for modifying assets.
- **Video Generation**: `veo-3.1-fast-generate-preview` for animating scenes.
- **Grounded Search**: `gemini-3-flash-preview` with `googleSearch` tool.
- **Maps Integration**: `gemini-2.5-flash` with `googleMaps` tool.
- **Storytelling**: `gemini-3-pro-preview` with thinking capability for analyzing creations.
- **TTS**: `gemini-2.5-flash-preview-tts` for voice narration.

## 🚀 Key Features

1.  **3D World**: Interactive isometric grid with dynamic lighting, day/night cycle, and weather particles.
2.  **Procedural Generation**: Buildings, trees, and citizens vary based on their coordinates.
3.  **Living World**:
    - **Population System**: Citizens walk paths, have accessories, and react to clicks.
    - **Wildlife System**: Birds and rabbits inhabit parks.
    - **Weather System**: Rain, snow, and sunny states affect visuals.
4.  **Magic Tools**: Users can type prompts to generate media or ask questions about the real world.

## 🛠️ Setup

1.  Ensure you have a valid Google Gemini API Key.
2.  The app uses the `window.aistudio` interface for key selection in the hosted environment, falling back to `process.env.API_KEY` if configured locally.
3.  Install dependencies: `npm install`
4.  Run development server: `npm run dev`

## 🧩 Directory Structure

- `components/`: React components (UI and 3D).
  - `3d/`: Three.js specific components (Buildings, Systems).
- `hooks/`: Custom React hooks (`useGameState`).
- `services/`: Business logic and API integrations (`geminiService`, `audio`, `storage`).
- `types.ts`: Shared TypeScript interfaces.
- `constants.tsx`: Game configuration (prices, colors, grid size).

## 🎨 Credits
Built with ❤️ using the Google Gemini API.
