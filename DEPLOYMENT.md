
# Deployment Guide

## 1. Vercel (Recommended)
- Build Command: `npm run build` (if using a bundler) or simply host `index.html`.
- Environment Variables: Ensure `API_KEY` is set in the Vercel dashboard.

## 2. Cloudflare Pages
- Root Directory: `/`
- Framework Preset: `None` (Static HTML)
- Enable "Compatibility Flag" for the latest Fetch API features.

## 3. Firebase Hosting
- Run `firebase init hosting`.
- Set `public` directory to your project root.
- Ensure `sw.js` is served with `Cache-Control: no-cache`.
