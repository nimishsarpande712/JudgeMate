# JudgeMate-AI — Deployment Guide

AI-powered hackathon judging platform for **Hack With Mumbai 2.0**.

---

## Architecture

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Vercel | `https://your-app.vercel.app` |
| Backend API | Render | `https://your-api.onrender.com` |
| Database | Supabase | `https://mukrpihzwudavauhqmnk.supabase.co` |
| AI | xAI (Grok) | via backend proxy |

---

## 1. Backend — Deploy to Render

### Option A: Blueprint (recommended)
1. Push to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Connect your repo — Render will auto-detect `render.yaml`
4. Set the environment variables when prompted

### Option B: Manual
1. Go to Render → **New** → **Web Service**
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### Environment Variables (Render)

| Variable | Value | Required |
|----------|-------|----------|
| `XAI_API_KEY` | Your xAI/Grok API key | **Yes** |
| `SUPABASE_URL` | `https://mukrpihzwudavauhqmnk.supabase.co` | Yes |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | Yes |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Yes |
| `PORT` | `3001` | No (default) |
| `NODE_ENV` | `production` | Auto-set by Render |

> **Important**: Set `ALLOWED_ORIGINS` to your Vercel frontend URL for CORS. Multiple origins can be comma-separated.

### Verify Backend
After deploy, visit: `https://your-api.onrender.com/api/health`  
Expected response: `{ "status": "ok", "services": { "xai": true, "supabase": true } }`

---

## 2. Frontend — Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Build settings (usually auto-detected):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Environment Variables (Vercel)

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_SUPABASE_URL` | `https://mukrpihzwudavauhqmnk.supabase.co` | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key | Yes |
| `VITE_API_URL` | `https://your-api.onrender.com` | **Yes** |

> **Do NOT set `VITE_XAI_API_KEY` in Vercel**. AI calls are routed through the backend proxy for security.

---

## 3. Supabase (already hosted)

Supabase is already running at `mukrpihzwudavauhqmnk.supabase.co`.

### Required tables
- `teams` — team data
- `scores` — scoring data  
- `user_roles` — user role assignments

### Edge Functions
The `score-team` edge function uses `GROQ_API_KEY`. Set this in Supabase Dashboard → Settings → Edge Functions → Secrets.

---

## Local Development

### Frontend
```bash
npm install
npm run dev
# Runs on http://localhost:8080
```

### Backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
# Runs on http://localhost:3001
```

### Environment setup
```bash
# Root .env (frontend)
VITE_SUPABASE_URL=https://mukrpihzwudavauhqmnk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_API_URL=http://localhost:3001

# server/.env (backend)
XAI_API_KEY=your_xai_api_key
SUPABASE_URL=https://mukrpihzwudavauhqmnk.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
ALLOWED_ORIGINS=http://localhost:8080
PORT=3001
```

---

## How AI Scoring Works

1. Frontend sends scoring request → Backend API (`/api/score`)
2. Backend calls xAI (Grok) API with project data & GitHub stats
3. Backend returns structured scores to frontend
4. If backend is unavailable, frontend falls back to client-side rule-based scoring

Same flow for mentorship (`/api/mentorship`).

---

## Security Notes

- API keys (`XAI_API_KEY`, `SUPABASE_SERVICE_KEY`) are **only** on the backend (Render)
- Frontend uses only the Supabase **anon** key (safe to expose)
- CORS restricts backend to your Vercel domain
- Rate limiting: 30 requests/minute per IP
- Helmet security headers on the backend
- `.env` is gitignored — never commit API keys
