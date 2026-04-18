# TaskWhisper

TaskWhisper turns spoken notes into cleaned transcripts, extracted tasks, summaries, and optional exports.

## Architecture
- `backend/`: FastAPI API, Firebase auth, local JSON storage, in-process cache
- `frontend/`: Next.js app for recording, reviewing results, and configuring providers

The backend no longer requires MongoDB or Redis. Runtime data is stored locally under `backend/data/`, and uploaded audio is stored under `backend/data/uploads/` by default.

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
- `FILE_STORAGE_PATH`: path for uploaded and intermediate audio files
- `FIREBASE_PROJECT_ID`: Firebase project used for token verification
- `ALLOW_INSECURE_AUTH=true`: allows local development without strict Firebase token validation

### Frontend
- `NEXT_PUBLIC_BACKEND_URL`: backend base URL, defaults to `http://localhost:8000`
- Firebase client variables in `frontend/.env.example`
- `NEXT_PUBLIC_MCP_SERVER_URL`: MCP SSE endpoint, typically `http://localhost:8000/api/mcp/sse`

## Pipeline
1. Voice cleaning
2. Speech-to-text
3. Text cleanup and optional translation
4. Task extraction
5. Optional export connectors

Progress updates stream over WebSocket at `/ws/jobs/{job_id}`.
