# TaskWhisper

TaskWhisper turns spoken notes into cleaned transcripts, extracted tasks, summaries, and optional exports.

## Architecture
- `backend/`: FastAPI API, Firebase auth, local JSON storage, in-process cache
- `frontend/`: Next.js app for recording, reviewing results, and configuring providers

Runtime data is stored locally under `backend/data/`, and uploaded audio is stored under `backend/data/uploads/` by default.

## Quickstart
1. Create a backend virtual environment and install dependencies:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```
2. Copy `backend/.env.example` to `backend/.env.local` or `backend/.env` and fill in the values you need.
3. Start the backend:
```powershell
cd backend
uvicorn main:app --reload
```
4. In a second terminal, install frontend dependencies and start Next.js:
```powershell
cd frontend
npm install
npm run dev
```
5. Open `http://localhost:3000`. The backend runs on `http://localhost:8000`.

## Configuration

### Backend
- `LOCAL_DB_PATH`: path to the local JSON data file
- `DATABASE_URL`: optional PostgreSQL connection string
- `POSTGRES_URL`: supported alias for `DATABASE_URL`
- `REDIS_URL`: Redis connection string used for LLM and pipeline result caching
- `FILE_STORAGE_PATH`: path for uploaded and intermediate audio files
- `BLOB_READ_WRITE_TOKEN` or `taskwhisper_VERCEL_READ_WRITE_TOKEN`: Vercel Blob token used to store uploaded voice files
- `FIREBASE_PROJECT_ID`: Firebase project used for token verification
- `ALLOW_INSECURE_AUTH=true`: allows local development without strict Firebase token validation
- `SUPABASE_URL`: Supabase project URL for TaskWhisper Cloud sync
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key used by the backend sync route
- `SUPABASE_SCHEMA`: Supabase PostgREST schema, defaults to `public`

### Frontend
- `NEXT_PUBLIC_BACKEND_URL`: backend base URL, defaults to `http://localhost:8000`
- Firebase client variables in `frontend/.env.example`

## Pipeline
1. Voice cleaning
2. Speech-to-text
3. Text cleanup and optional translation
4. Task extraction
5. Optional export connectors

Progress updates stream over WebSocket at `/ws/jobs/{job_id}`.

Uploaded voice files are stored in Vercel Blob when a blob token is configured. During processing, the backend downloads the blob to a temporary local file so the current cleanup and STT adapters can read it.

## TaskWhisper Cloud Sync

Cloud sync is handled by the backend, not directly by the browser. When a signed-in user clicks sync in Settings, the frontend sends its current notes and extracted tasks to the backend, and the backend upserts them into Supabase using the service-role key.

Before using it:

1. Apply [supabase/taskwhisper_cloud_schema.sql](/g:/projects/taskwhisper/supabase/taskwhisper_cloud_schema.sql) in your Supabase SQL editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend environment.
3. Restart the backend.
