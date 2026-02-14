

# HackJudge AI — MVP Plan

## Overview
A live hackathon judging platform where judges log in, submit project details (GitHub URL, description, screenshots), and get instant AI-powered scores across 8 weighted criteria. Real-time rankings update as judges score, with CSV export for organizers.

---

## 1. Judge Authentication
- Email/password signup & login via Supabase Auth
- Protected routes — only authenticated judges can access the dashboard
- Simple role system: **Judge** (scores teams) and **Admin** (manages teams, exports data, overrides scores)

## 2. Database Schema
- **teams** table: team name, project name, domain (HealthTech, SmartCities, etc.), GitHub URL, description, screenshot URLs, created_at
- **scores** table: linked to team + judge, stores all 8 criteria scores (1-10), AI-generated explanations, judge override flags, timestamps
- **user_roles** table: admin/judge roles with secure RLS policies
- Real-time subscriptions on scores table for live updates

## 3. Team Submission Form
- Multi-step form for adding a hackathon team's project:
  1. **Basic Info**: Team name, project name, domain category dropdown
  2. **Project Details**: GitHub repo URL, project description (textarea)
  3. **Media**: Screenshot upload (stored in Supabase Storage)
- Admins can pre-load sample teams; judges can also add teams on the fly

## 4. AI Scoring Engine (Supabase Edge Function + Lovable AI)
- Edge function fetches **real GitHub API data** (stars, forks, commit count, contributors, languages) from the public GitHub API
- Sends project description + GitHub stats + extracted context to **Lovable AI (Gemini Flash)** with a structured scoring prompt
- AI returns scores 1-10 for each weighted criterion with brief explanations:
  - Innovation (30%) — Novelty vs existing solutions
  - Technical Feasibility (20%) — Code quality signals from repo
  - Impact/Potential (20%) — Real-world problem addressed
  - MVP Completeness (10%) — Working demo indicators
  - Presentation (5%) — Description clarity
  - Tech Stack Relevance (5%) — Appropriate tools for domain
  - Team Collaboration (5%) — Commit distribution across contributors
  - Originality (5%) — Uniqueness of approach
- **Fallback**: If AI API fails, rule-based heuristic scoring (keyword analysis + GitHub stats formulas)
- Scores arrive in under 10 seconds

## 5. Judge Dashboard
- **Score View**: See AI-generated scores per team with explanations
- **Override Sliders**: Judges can adjust any criterion score with a note explaining why
- **Team Cards**: Show GitHub avatar, repo stats, domain badge, and aggregate score
- **Domain Filter**: Filter teams by category (HealthTech, SmartCities, EdTech, etc.)

## 6. Live Rankings Table
- Real-time sortable leaderboard showing all teams ranked by weighted total score
- Columns: Rank, Team Name, Domain, Total Score, individual criteria scores
- Auto-refreshes via Supabase real-time subscriptions as new scores come in
- Visual indicators for score changes (animations on update)

## 7. Export & Sharing
- **CSV Export**: Download full rankings with all criteria scores and judge notes
- **Individual Scorecards**: View/print detailed scorecard per team with AI explanations

## 8. Demo Page
- Public `/demo` route (no auth required) with 3-5 pre-loaded sample hackathon projects
- Visitors can paste any public GitHub URL → get instant AI scores
- Perfect for the 3-minute live demo: judges interact and see results immediately

## 9. UI & Polish
- Clean, modern dashboard design with Tailwind CSS
- Mobile-responsive layout (judges may use tablets)
- Loading spinners during API calls with skeleton states
- Toast notifications for score submissions and errors
- Graceful error handling: API failures show friendly messages with retry options

## 10. Bias Mitigation
- Show score distribution across judges to highlight disagreements
- Flag teams where all scores are suspiciously identical
- Judge override history is logged and visible to admins

