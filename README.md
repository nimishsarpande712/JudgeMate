<p align="center">
  <img src="https://img.shields.io/badge/⚖️-JudgeMate--AI-7c3aed?style=for-the-badge&labelColor=1e1b4b" alt="JudgeMate-AI" />
</p>
 Link : https://judge-mate.vercel.app/
<h1 align="center">JudgeMate-AI</h1>

<p align="center">
  <b>AI-Powered Hackathon Judging Platform</b><br/>
  Built for <em>Hack With Mumbai 2.0</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-Hosted-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/xAI_Grok-AI_Scoring-000000?logo=x&logoColor=white" alt="xAI" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Scoring Criteria](#scoring-criteria)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**JudgeMate-AI** is a full-stack, AI-powered hackathon judging platform that automates project evaluation across 8 weighted criteria. Judges can review submissions, trigger AI scoring, analyze GitHub repositories, detect plagiarism, and export rankings — all from a single dashboard.

Students submit their projects (with GitHub links, descriptions, and PPT files), and the platform automatically analyzes code quality, commit history, and originality using real GitHub API data and large language models.

---

## Features

### 🎓 Student Portal
- **Project Submission** — Team name, project name, description, domain selection, GitHub URL, and PPT upload
- **GitHub Integration** — Automatic repository analysis (commits, languages, structure, contributors)
- **Real-time Validation** — Form validation, GitHub URL format checking, and duplicate submission prevention
- **Plagiarism Detection** — Instant plagiarism risk scoring with detailed breakdown

### 🧑‍⚖️ Judge Dashboard
- **AI Scoring** — One-click AI evaluation powered by xAI (Grok) with detailed explanations per criterion
- **Manual Scoring** — Judges can also score projects manually with custom questions
- **Plagiarism Analysis** — AI pattern detection, boilerplate matching, commit history analysis, and code modularity scoring
- **Re-scoring** — Full re-analysis capability (re-fetches GitHub data, re-runs plagiarism, re-scores with AI)
- **Rankings** — Real-time leaderboard sorted by weighted AI scores
- **CSV Export** — Export all rankings with per-criterion scores to CSV
- **Notifications** — Real-time notification system for new submissions and score updates
- **Filters & Search** — Filter projects by domain, search by team/project name

### 🤖 AI & Analysis
- **8-Criterion Scoring** — Innovation, Technical Feasibility, Impact, MVP Completeness, Presentation, Code Quality, Team Collaboration, Originality
- **GitHub Repository Analysis** — Commits, contributors, languages, stars, forks, file structure, modularity
- **Plagiarism Detection** — Multi-signal detection (AI patterns, boilerplate, commit history, code modularity)
- **AI Mentorship** — Improvement suggestions, action plans, and tech recommendations
- **Recommendation Engine** — Smart question generation for judges based on project data

### 🎨 UI/UX
- **Dark/Light Theme** — Full theme toggle with persistent preference
- **Responsive Design** — Mobile-first, works on all screen sizes
- **Glassmorphism UI** — Modern backdrop-blur cards with gradient accents
- **PPT Viewer** — In-browser PowerPoint file preview

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5.8, Vite 5.4 |
| **Styling** | Tailwind CSS 3.4, Shadcn/UI (Radix Primitives) |
| **State** | TanStack React Query, localStorage |
| **Routing** | React Router 6 |
| **Charts** | Recharts |
| **Backend API** | Express.js, TypeScript, Helmet, CORS, Rate Limiting |
| **AI** | xAI (Grok) API via backend proxy |
| **Database** | Supabase (PostgreSQL) |
| **Edge Functions** | Supabase Edge Functions (Deno) + Groq API |
| **Auth** | Local auth (localStorage-based) |
| **Deployment** | Frontend → Vercel, Backend → Render, DB → Supabase |

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend API    │────▶│   xAI/Grok  │
│   (Vercel)   │     │   (Render)       │     │   API       │
│              │     │                  │     └─────────────┘
│  React+Vite  │     │  Express+TS      │
│  Shadcn UI   │     │  Helmet+CORS     │
└──────┬───────┘     └──────────────────┘
       │
       │ (Supabase JS Client)
       ▼
┌──────────────────┐
│    Supabase      │
│  (PostgreSQL +   │
│  Edge Functions) │
└──────────────────┘
```

- **Frontend** sends scoring/mentorship requests to the **Backend API**
- **Backend** securely calls xAI (Grok) with the API key — never exposed to the client
- **Supabase** handles data storage (teams, scores, user roles) and has its own edge function for Groq-based scoring
- If the backend is unavailable, the frontend gracefully falls back to client-side rule-based scoring

---

## Project Structure

```
├── public/                     # Static assets
├── server/                     # Backend API (Express.js)
│   ├── src/
│   │   ├── index.ts            # Entry point — CORS, rate limiting, routes
│   │   ├── routes/
│   │   │   ├── health.ts       # GET  /api/health
│   │   │   ├── scoring.ts      # POST /api/score
│   │   │   └── mentorship.ts   # POST /api/mentorship
│   │   └── services/
│   │       └── xai.ts          # xAI (Grok) API client
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # Global error boundary
│   │   ├── StudentLogin.tsx     # Auth page (student/judge)
│   │   ├── ProjectSubmission.tsx# Student submission form
│   │   ├── JudgeDashboard.tsx   # Judge dashboard with stats & filters
│   │   ├── JudgeTeamCard.tsx    # Individual project card (scoring, plagiarism)
│   │   ├── JudgeRankingsTable.tsx# Rankings leaderboard
│   │   ├── AIMentorshipPanel.tsx# AI mentorship panel
│   │   ├── PlagiarismDetector.tsx# Plagiarism details display
│   │   ├── RecommendationEngine.tsx# Smart question generator
│   │   ├── PPTViewer.tsx        # PowerPoint viewer
│   │   ├── ThemeToggle.tsx      # Dark/light mode toggle
│   │   └── ui/                  # Shadcn/UI components (40+ components)
│   ├── hooks/
│   │   ├── useLocalAuth.tsx     # Authentication hook (localStorage)
│   │   ├── useProjects.ts       # Project CRUD hook
│   │   ├── useNotifications.ts  # Notification system hook
│   │   └── useLocalStorage.ts   # Generic localStorage hook
│   ├── lib/
│   │   ├── apiClient.ts         # Backend API client (proxy)
│   │   ├── aiScoring.ts         # Client-side rule-based AI scoring
│   │   ├── groqScoring.ts       # xAI scoring (backend proxy + fallback)
│   │   ├── aiMentorship.ts      # AI mentorship (backend proxy + fallback)
│   │   ├── githubAnalyzer.ts    # GitHub repository analyzer
│   │   ├── plagiarism.ts        # Plagiarism detection engine
│   │   ├── recommendations.ts   # Question recommendation engine
│   │   └── scoring.ts           # Scoring utilities & criteria
│   ├── pages/
│   │   ├── Landing.tsx          # Landing page
│   │   ├── Dashboard.tsx        # Legacy dashboard
│   │   └── NotFound.tsx         # 404 page
│   ├── types/
│   │   └── index.ts             # All TypeScript types & constants
│   ├── App.tsx                  # Routes & providers
│   └── main.tsx                 # Entry point
├── supabase/
│   ├── functions/
│   │   └── score-team/
│   │       └── index.ts         # Deno edge function (Groq scoring)
│   ├── migrations/              # Database migrations
│   └── config.toml              # Supabase config
├── vercel.json                  # Vercel deployment config
├── render.yaml                  # Render deployment config (Blueprint)
├── DEPLOYMENT.md                # Detailed deployment guide
├── .env.example                 # Frontend env template
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 — [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** ≥ 9
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/your-username/judgemate-ai.git
cd judgemate-ai
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_API_URL=http://localhost:3001
```

### 4. Start the frontend

```bash
npm run dev
# → http://localhost:8080
```

### 5. Set up the backend (optional — enables AI scoring)

```bash
cd server
npm install
cp .env.example .env
# Edit server/.env with your XAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
npm run dev
# → http://localhost:3001
```

### 6. Verify

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:3001/api/health`

---

## Environment Variables

### Frontend (Vercel)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Yes |
| `VITE_API_URL` | Backend API URL (Render) | Yes |

> ⚠️ **Do NOT set `VITE_XAI_API_KEY` in production** — AI calls are routed through the backend proxy.

### Backend (Render)

| Variable | Description | Required |
|----------|-------------|----------|
| `XAI_API_KEY` | xAI (Grok) API key | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `ALLOWED_ORIGINS` | Frontend URL(s) for CORS | Yes |
| `PORT` | Server port (default: 3001) | No |

### Supabase Edge Functions

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (set via `supabase secrets set`) |

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full step-by-step deployment instructions.

**Quick summary:**

| Service | Platform | Config File |
|---------|----------|-------------|
| Frontend | Vercel | `vercel.json` |
| Backend | Render | `render.yaml` |
| Database | Supabase | Already hosted |

---

## API Endpoints

### Backend API (Render)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check — returns configured service status |
| `POST` | `/api/score` | AI-score a project (GitHub URL, description, domain) |
| `POST` | `/api/mentorship` | Get AI mentorship (improvements, action plan, tech suggestions) |

### Supabase Edge Function

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/functions/v1/score-team` | Score a project via Groq (Llama 3.3 70B) |

---

## Scoring Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| 💡 Innovation | 25% | Novelty and creativity of the idea |
| ⚙️ Technical Feasibility | 20% | Technical implementation quality |
| 🚀 Impact / Potential | 20% | Real-world impact and scalability |
| ✅ MVP Completeness | 10% | Working prototype completeness |
| 🎤 Presentation | 10% | Clarity of description and pitch |
| 📝 Code Quality | 5% | Code structure, modularity, best practices |
| 🤝 Team Collaboration | 5% | Git activity, contributors, commit patterns |
| 🎯 Originality | 5% | Uniqueness vs. boilerplate/templates |

**Total weighted score: 1–10 scale**

---

## Screenshots

> _Add screenshots of the landing page, student submission form, judge dashboard, and AI scoring results here._

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is built for **Hack With Mumbai 2.0**. All rights reserved.
