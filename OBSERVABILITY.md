
# Observability

## 1. Release Tracking
- Current build version is stored in `storage.ts` versioning. If `GRID_SIZE` changes, saves are invalidated to prevent Three.js geometry crashes.

## 2. Error Reporting
- Errors from `geminiService` are caught and displayed to users as "Magic Fizzles". 
- Integrated with standard `console.error` for browser-based monitoring (Sentry/LogRocket).

## 3. Performance Metrics
- **FPS:** Monitored via Three.js internally. If FPS < 30, "Potato Mode" (Low Graphics) is suggested to the user.
- **AI Latency:** Tracked in `App.tsx` during `handleMagicAction`.
