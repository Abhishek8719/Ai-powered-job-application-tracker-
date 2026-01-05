# Deploy: Vercel (frontend) + Render (backend)

## Frontend (Vercel)
- Project root: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE_URL` = your Render backend URL (e.g. `https://your-service.onrender.com`)

## Backend (Render)
- Project root: `backend/`
- Build command: `npm run build`
- Start command: `npm run start`
- Environment variables (Render dashboard):
  - `PORT` (Render sets this automatically in many templates; keep `PORT` supported)
  - `CORS_ORIGIN` = your Vercel app origin (you can use a comma-separated list)
  - `JWT_SECRET`
  - `COOKIE_SECURE=true`
  - `COOKIE_SAMESITE=none` (typically required when frontend/backend are on different domains)
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`)

## Notes
- This repo intentionally keeps env files separate:
  - Backend loads only `backend/.env`
  - Frontend uses Vite env files in `frontend/` (only variables prefixed with `VITE_` are exposed to the browser)
- If you deploy frontend+backend on different domains, browser cookie rules may affect auth. The recommended settings are `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.
