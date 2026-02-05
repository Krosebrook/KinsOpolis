
# PWA Strategy: Super City Builder 3000

## 1. Installability
- **Manifest:** Defined in `manifest.json`. Uses `display: standalone` to provide a game-like experience.
- **Icons:** Large (512x512) maskable icons are supported for varied Android/iOS launchers.

## 2. Caching Strategy
- **Static Assets (Stale-While-Revalidate):** The service worker (`sw.js`) caches the core logic, styles, and Three.js modules. It serves cached copies immediately while updating them in the background.
- **CDN Modules:** Imports from `aistudiocdn.com` are cached locally to minimize latency for Three.js and React core.
- **API (Network Only):** Gemini API calls and Veo video generation are *never* cached to ensure real-time results and prevent huge blob storage in the cache.

## 3. Offline Behavior
- **Fallback Page:** Users receive `offline.html` if the initial load fails without connection.
- **Graceful Degradation:** The 3D world remains interactive if assets are cached, but "Magic Actions" (AI) will provide a "Lost connection" toast via the `handleApiError` utility.

## 4. Updates
- The SW uses `skipWaiting()` and `clients.claim()` to ensure that when a user refreshes after a build, they immediately get the latest game logic without needing to close all tabs.
