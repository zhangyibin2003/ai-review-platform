# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 课程智能复习平台 (AI Course Smart Review Platform) — a full-stack web app where teachers upload course PPT/PDF files, and a DeepSeek AI generates structured Markdown notes and exam question banks. Students browse notes, take quizzes, and track wrong answers in an error book.

## Common Commands

### One-click development startup
```bash
bash start.sh
```
Starts backend on `:8000` and frontend on `:3000`. Ctrl+C stops both.

### Frontend (Next.js 14)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Next.js dev server on port 3000
npm run build            # Production build
```

### Backend (Python 3.11 / FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Dev server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# API docs auto-generated at http://localhost:8000/docs
```

### No test or lint commands are configured for either frontend or backend.

## Architecture

### Backend (`backend/`)
- **Python 3.11**, **FastAPI** with **SQLite** (SQLAlchemy 2.0 ORM)
- `main.py` — App entry point: creates FastAPI app, sets up CORS (allow all origins), creates DB tables on startup, seeds a default demo user (`demo` / `demo123`, teacher role), registers routers
- `config.py` — Reads env vars: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `SECRET_KEY`, `HOST`, `PORT`
- `api/` — Route handlers split by domain: `auth.py`, `courses.py`, `notes.py`, `questions.py`, `quiz.py`
- `models/db.py` — All SQLAlchemy models (users, courses, course_files, knowledge_points, notes, note_sections, cases, questions, quiz_attempts, error_book)
- `services/` — Business logic: `ai_service.py` (DeepSeek API wrapper via httpx, OpenAI-compatible `/chat/completions`), `pdf_service.py` (PyMuPDF text extraction), `note_service.py` (AI note generation from PDF text), `question_service.py` (AI question bank generation), `case_service.py` (AI case analysis)
- `prompts/` — Chinese system prompts for DeepSeek: note generation/condensation, question generation, case analysis
- Auth uses SHA256 password hashing. `get_current_user()` in auth.py always returns the hardcoded demo user (1) instead of validating JWT tokens — auth is effectively disabled.

### Frontend (`frontend/`)
- **Next.js 14 App Router**, **TypeScript** (strict), **Tailwind CSS 3**
- `app/` routing:
  - `/` — Landing/hero page
  - `/login` — Login/register
  - `/dashboard` — Course list
  - `/course/[id]` — Course detail (PDF upload, trigger AI generation)
  - `/course/[id]/notes` — AI-generated notes with Markdown + KaTeX rendering
  - `/course/[id]/quiz` — Quiz player + error book
  - `/course/[id]/cases` — Knowledge point case analysis
- `lib/api.ts` — All API calls, detects localhost vs production, uses `NEXT_PUBLIC_API_URL` env var for production URL. Production API: `https://ai-review-backend-7iw2.onrender.com/api`
- `lib/types.ts` — TypeScript interfaces for all data models
- No external state management — all state is local `useState`/`useEffect`. User info stored in `localStorage` key `"user"`.

### API Proxy
In development, `next.config.js` proxies `/api/*` to `http://127.0.0.1:8000/api/*`. In production, the frontend calls the API base URL directly.

### Deployment
- **Frontend**: Vercel (`.vercelignore` excludes `backend/`)
- **Backend**: Render.com (`render.yaml` configures Python web service, Singapore region)
- `.env.production` sets `NEXT_PUBLIC_API_URL` to the Render backend URL

## Key Notes
- `backend/.env` contains the live DeepSeek API key — treat with care (it's checked into the repo).
- The SQLite database (`backend/data/app.db`) is checked into the repo.
- No authentication guard on most API endpoints — the backend always uses the demo user (teacher, user_id=1).
- AI generation endpoints (`generate-notes`, `generate-questions`, `generate-case`, `generate-weakness`) are synchronous HTTP calls that may take 30-60+ seconds.
