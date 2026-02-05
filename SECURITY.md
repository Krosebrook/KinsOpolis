
# Security Policy

## 1. Secrets Management
- **API Keys:** The Gemini API key is managed via `process.env.API_KEY`. 
- **User Permission:** In hosted environments, the `window.aistudio.openSelectKey()` dialog ensures users control their billing and key lifecycle.

## 2. Content Security Policy (CSP)
Suggested headers for production deployment:
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com;
connect-src 'self' https://generativelanguage.googleapis.com;
img-src 'self' data: blob:;
style-src 'self' 'unsafe-inline';
```

## 3. Storage
- All user city data is stored in `localStorage`. 
- **Risk:** Sensitive data should not be stored here. Currently, the app only stores city geometry and fake currency stats.
