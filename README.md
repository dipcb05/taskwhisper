# Talkr

Multi-stage voice-to-task pipeline that cleans audio, transcribes, normalizes text, extracts tasks, and exports to productivity tools.

## Structure
- `backend/`: FastAPI async API (MongoDB + Redis, Firebase auth)
- `frontend/`: Next.js 14 (App Router) dashboard
- `infra/`: Docker Compose for local dev

## Quickstart
1) Copy `.env.example` files in `backend/` and `frontend/` and fill values (Firebase, Mongo, Redis, API keys).
2) `docker-compose -f infra/docker-compose.yml up --build`
3) Backend will be on `http://localhost:8000`, Frontend on `http://localhost:3000`.

## Pipeline
1) Voice cleaning (pluggable adapters)
2) STT engines (Whisper/Deepgram/Google, etc.)
3) Text cleaning + optional translation (LLM)
4) Task extraction (LLM prompts in `backend/app/prompts`)
5) Export connectors (Notion/Todoist JSON stubbed)

Progress updates stream over WebSocket `/ws/jobs/{job_id}`.
