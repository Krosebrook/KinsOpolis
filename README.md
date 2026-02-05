
# Sky Metropolis Builder 3000

## 🏆 Quality Metrics
The project refactor maintains a high **QualityScore**:
`QualityScore = (LighthousePWA * 0.4) + (OfflineReady * 0.3) + (AILatencyScore * 0.2) + (A11yScore * 0.1)`

- **Lighthouse PWA:** Target 100/100.
- **OfflineReady:** Binary (1 if fallback page works).
- **AILatencyScore:** Inverse of average response time for Gemini Flash.

## 🏗️ Architecture
- **Rendering:** Three.js with InstancedMesh for high-performance citizens and particles.
- **Logic:** Custom hooks (`useGameState`) manage persistent JSON state.
- **Service Worker:** Production-ready lifecycle for asset durability.

## ✅ Verification
1. Run `npx serve .`
2. Open Chrome DevTools -> Application -> Service Workers.
3. Check "Offline" and refresh.
4. Verify `offline.html` or cached `index.html` loads.
